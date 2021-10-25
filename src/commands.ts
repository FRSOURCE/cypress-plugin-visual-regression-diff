import { FILE_SUFFIX, LINK_PREFIX, TASK } from "./constants";
import type pixelmatch from "pixelmatch";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    type MatchImageOptions = {
      suffix?: string;
      screenshotConfig?: Partial<Cypress.ScreenshotDefaultsOptions>;
      diffConfig?: Parameters<typeof pixelmatch>[5];
    };

    interface Chainable {
      /**
       * Command to create and compare image snapshots.
       * @memberof Cypress.Chainable
       * @example cy.get('.my-element').matchImage();
       */
      matchImage<T extends Chainable<unknown>>(this: T, options?: Cypress.MatchImageOptions): T;
    }
  }
}

const nameCacheCounter: Record<string, number> = {};

Cypress.Commands.add(
  "matchImage",
  { prevSubject: "optional" },
  (
    subject?: JQuery<HTMLElement>,
    options: Cypress.MatchImageOptions = {}
  ) => {
    let title = Cypress.currentTest.titlePath.join(" ");
    if (typeof nameCacheCounter[title] === "undefined")
      nameCacheCounter[title] = -1;
    title += ` #${++nameCacheCounter[title]}`;

    return cy
      .log("visual regression diff")
      .then(() =>
        cy.task(TASK.getScreenshotPath, {
          title,
          specPath: Cypress.spec.relative,
        })
      )
      .then((screenshotPath) => {
        let imgPath: string;
        return (subject ? cy.wrap(subject) : cy)
          .screenshot(screenshotPath as string, {
            ...options.screenshotConfig,
            onAfterScreenshot(el, props) {
              imgPath = props.path;
              options.screenshotConfig?.onAfterScreenshot?.(el, props);
            },
          })
          .then(() => imgPath);
      })
      .then((imgPath) =>
        cy
          .task(TASK.compareImages, {
            imgNew: imgPath,
            imgOld: imgPath.replace(FILE_SUFFIX.actual, ""),
            ...(options.diffConfig || {}),
          })
          .then((res) => ({
            res: res as null | {
              error?: boolean;
              message?: string;
              imgDiff?: number;
              maxDiffThreshold?: number;
            },
            imgPath,
          }))
      )
      .then(({ res, imgPath }) => {
        const log = Cypress.log({
          name: "log",
          displayName: "Match image",
          $el: subject,
        });

        if (!res) {
          log.set("message", "Unexpected error!");
          const err = new Error("Unexpected error!");
          // only way to throw & log the message properly in Cypress
          // https://github.com/cypress-io/cypress/blob/5f94cad3cb4126e0567290b957050c33e3a78e3c/packages/driver/src/cypress/error_utils.ts#L214-L216
          (err as unknown as { onFail: (e: Error) => void }).onFail = (
            err: Error
          ) => log.error(err);
          throw err;
        }

        if (res.error) {
          log.set(
            "message",
            `${res.message}\n[See comparison](${LINK_PREFIX}${btoa(
              JSON.stringify({ title, imgPath })
            )})`
          );
          log.set("consoleProps", () => res);
          const err = new Error(res.message);
          // only way to throw & log the message properly in Cypress
          // https://github.com/cypress-io/cypress/blob/5f94cad3cb4126e0567290b957050c33e3a78e3c/packages/driver/src/cypress/error_utils.ts#L214-L216
          (err as unknown as { onFail: (e: Error) => void }).onFail = (
            err: Error
          ) => log.error(err);
          throw err;
        } else {
          log.set("message", res.message);
        }
      });
  }
);
