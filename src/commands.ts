import { FILE_SUFFIX, LINK_PREFIX, TASK } from "./constants";
import type pixelmatch from "pixelmatch";
import * as Base64 from "@frsource/base64";
import type { CompareImagesTaskReturn } from "./types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    type MatchImageOptions = {
      screenshotConfig?: Partial<Cypress.ScreenshotDefaultsOptions>;
      diffConfig?: Parameters<typeof pixelmatch>[5];
      updateImages?: boolean;
      imagesDir?: string;
      maxDiffThreshold?: number;
      title?: string;
    };

    interface Chainable<Subject> {
      /**
       * Command to create and compare image snapshots.
       * @memberof Cypress.Chainable
       * @example cy.get('.my-element').matchImage();
       */
      matchImage(options?: Cypress.MatchImageOptions): Chainable<Subject>;
    }
  }
}

const nameCacheCounter: Record<string, number> = {};

const constructCypressError = (log: Cypress.Log, err: Error) => {
  // only way to throw & log the message properly in Cypress
  // https://github.com/cypress-io/cypress/blob/5f94cad3cb4126e0567290b957050c33e3a78e3c/packages/driver/src/cypress/error_utils.ts#L214-L216
  (err as unknown as { onFail: (e: Error) => void }).onFail = (err: Error) =>
    log.error(err);
  return err;
};

export const getConfig = (options: Cypress.MatchImageOptions) => ({
  scaleFactor:
    Cypress.env("pluginVisualRegressionForceDeviceScaleFactor") === false
      ? 1
      : 1 / window.devicePixelRatio,
  updateImages:
    options.updateImages ||
    (Cypress.env("pluginVisualRegressionUpdateImages") as
      | boolean
      | undefined) ||
    false,
  imagesDir:
    options.imagesDir ||
    (Cypress.env("pluginVisualRegressionImagesDir") as string | undefined) ||
    "__image_snapshots__",
  maxDiffThreshold:
    options.maxDiffThreshold ||
    (Cypress.env("pluginVisualRegressionMaxDiffThreshold") as
      | number
      | undefined) ||
    0.01,
  diffConfig:
    options.diffConfig ||
    (Cypress.env("pluginVisualRegressionDiffConfig") as
      | Parameters<typeof pixelmatch>[5]
      | undefined) ||
    {},
  screenshotConfig:
    options.screenshotConfig ||
    (Cypress.env("pluginVisualRegressionScreenshotConfig") as
      | Partial<Cypress.ScreenshotDefaultsOptions>
      | undefined) ||
    {},
});

Cypress.Commands.add(
  "matchImage",
  { prevSubject: "optional" },
  (subject, options = {}) => {
    const $el = subject as JQuery<HTMLElement> | undefined;
    let title = options.title || Cypress.currentTest.titlePath.join(" ");
    if (typeof nameCacheCounter[title] === "undefined")
      nameCacheCounter[title] = -1;
    title += ` #${++nameCacheCounter[title]}`;

    const {
      scaleFactor,
      updateImages,
      imagesDir,
      maxDiffThreshold,
      diffConfig,
      screenshotConfig,
    } = getConfig(options);

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
          .task<CompareImagesTaskReturn>(
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
            res,
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
          throw constructCypressError(log, new Error("Unexpected error!"));
        }

        log.set(
          "message",
          `${res.message}${
            res.imgDiffBase64 && res.imgNewBase64 && res.imgOldBase64
              ? `\n[See comparison](${LINK_PREFIX}${Base64.encode(
                  encodeURIComponent(
                    JSON.stringify({
                      title,
                      imgPath,
                      imgDiffBase64: res.imgDiffBase64,
                      imgNewBase64: res.imgNewBase64,
                      imgOldBase64: res.imgOldBase64,
                      error: res.error,
                    })
                  )
                )})`
              : ""
          }`
        );

        if (res.error) {
          log.set("consoleProps", () => res);
          throw constructCypressError(log, new Error(res.message));
        }
      });
  }
);
