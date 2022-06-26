import { FILE_SUFFIX, LINK_PREFIX, TASK } from "./constants";
import type pixelmatch from "pixelmatch";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    type MatchImageOptions = {
      screenshotConfig?: Partial<Cypress.ScreenshotDefaultsOptions>;
      diffConfig?: Parameters<typeof pixelmatch>[5];
      updateImages?: boolean;
      imagesDir?: string;
      maxDiffThreshold?: number;
    };

    interface Chainable<Subject> {
      /**
       * Command to create and compare image snapshots.
       * @memberof Cypress.Chainable
       * @example cy.get('.my-element').matchImage();
       */
      matchImage(
        options?: Cypress.MatchImageOptions
      ): Chainable<Subject>;
    }
  }
}

const nameCacheCounter: Record<string, number> = {};

Cypress.Commands.add(
  "matchImage",
  { prevSubject: 'optional' },
  (subject, options = {}) => {
    const $el = subject as JQuery<HTMLElement> | undefined;
    let title = Cypress.currentTest.titlePath.join(" ");
    if (typeof nameCacheCounter[title] === "undefined")
      nameCacheCounter[title] = -1;
    title += ` #${++nameCacheCounter[title]}`;

    const scaleFactor =
      Cypress.env("pluginVisualRegressionForceDeviceScaleFactor") === false
        ? 1
        : 1 / window.devicePixelRatio;
    const updateImages =
      options.updateImages ||
      (Cypress.env("pluginVisualRegressionUpdateImages") as
        | boolean
        | undefined) ||
      false;
    const imagesDir =
      options.imagesDir ||
      (Cypress.env("pluginVisualRegressionImagesDir") as string | undefined) ||
      "__image_snapshots__";
    const maxDiffThreshold =
      options.maxDiffThreshold ||
      (Cypress.env("pluginVisualRegressionMaxDiffThreshold") as
        | number
        | undefined) ||
      0.01;
    const diffConfig =
      options.diffConfig ||
      (Cypress.env("pluginVisualRegressionDiffConfig") as
        | Parameters<typeof pixelmatch>[5]
        | undefined) ||
      {};
    const screenshotConfig =
      options.screenshotConfig ||
      (Cypress.env("pluginVisualRegressionScreenshotConfig") as
        | Partial<Cypress.ScreenshotDefaultsOptions>
        | undefined) ||
      {};

    return cy
      .then(() =>
        cy.task(
          TASK.getScreenshotPath,
          {
            title,
            imagesDir,
            specPath: Cypress.spec.relative,
          },
          { log: false }
        )
      )
      .then((screenshotPath) => {
        let imgPath: string;
        return ($el ? cy.wrap($el) : cy)
          .screenshot(screenshotPath as string, {
            ...screenshotConfig,
            onAfterScreenshot(el, props) {
              imgPath = props.path;
              screenshotConfig.onAfterScreenshot?.(el, props);
            },
            log: false,
          })
          .then(() => imgPath);
      })
      .then((imgPath) =>
        cy
          .task(
            TASK.compareImages,
            {
              scaleFactor,
              imgNew: imgPath,
              imgOld: imgPath.replace(FILE_SUFFIX.actual, ""),
              updateImages,
              maxDiffThreshold,
              diffConfig,
            },
            { log: false }
          )
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
          $el,
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
