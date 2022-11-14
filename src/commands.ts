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
      /**
       * @deprecated since version 3.0, use imagesPath instead
       */
      imagesDir?: string;
      imagesPath?: string;
      maxDiffThreshold?: number;
      title?: string;
      matchAgainstPath?: string;
      // IDEA: to be implemented if support for files NOT from filesystem needed
      // matchAgainst?: string | Buffer;
    };

    type MatchImageReturn = {
      diffValue: number | undefined;
      imgNewPath: string;
      imgPath: string;
      imgDiffPath: string;
      imgNewBase64: string | undefined;
      imgBase64: string | undefined;
      imgDiffBase64: string | undefined;
      imgNew: InstanceType<Cypress["Buffer"]> | undefined;
      img: InstanceType<Cypress["Buffer"]> | undefined;
      imgDiff: InstanceType<Cypress["Buffer"]> | undefined;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Chainable<Subject> {
      /**
       * Command to create and compare image snapshots.
       * @memberof Cypress.Chainable
       * @example cy.get('.my-element').matchImage();
       */
      matchImage(
        options?: Cypress.MatchImageOptions
      ): Chainable<MatchImageReturn>;
    }
  }
}

const constructCypressError = (log: Cypress.Log, err: Error) => {
  // only way to throw & log the message properly in Cypress
  // https://github.com/cypress-io/cypress/blob/5f94cad3cb4126e0567290b957050c33e3a78e3c/packages/driver/src/cypress/error_utils.ts#L214-L216
  (err as unknown as { onFail: (e: Error) => void }).onFail = (err: Error) =>
    log.error(err);
  return err;
};

const getImagesDir = (options: Cypress.MatchImageOptions) => {
  const imagesDir =
    options.imagesDir ||
    (Cypress.env("pluginVisualRegressionImagesDir") as string | undefined);

  // TODO: remove in 4.0.0
  if (imagesDir) {
    console.warn(
      "@frsource/cypress-plugin-visual-regression-diff] `imagesDir` option is deprecated, use `imagesPath` instead (https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff#configuration)"
    );
  }

  return imagesDir;
};

export const getConfig = (options: Cypress.MatchImageOptions) => {
  const imagesDir = getImagesDir(options);

  return {
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
    imagesPath:
      (imagesDir && `{spec_path}/${imagesDir}`) ||
      options.imagesPath ||
      (Cypress.env("pluginVisualRegressionImagesPath") as string | undefined) ||
      "{spec_path}/__image_snapshots__",
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
    matchAgainstPath: options.matchAgainstPath || undefined,
  };
};

Cypress.Commands.add(
  "matchImage",
  { prevSubject: "optional" },
  (subject, options = {}) => {
    const $el = subject as JQuery<HTMLElement> | undefined;
    let title: string;

    const {
      scaleFactor,
      updateImages,
      imagesPath,
      maxDiffThreshold,
      diffConfig,
      screenshotConfig,
      matchAgainstPath,
    } = getConfig(options);

    const currentRetryNumber = (
      cy as unknown as { state: (s: string) => { currentRetry: () => number } }
    )
      .state("test")
      .currentRetry();

    return cy
      .then(() =>
        cy.task<{ screenshotPath: string; title: string }>(
          TASK.getScreenshotPathInfo,
          {
            titleFromOptions:
              options.title || Cypress.currentTest.titlePath.join(" "),
            imagesPath,
            specPath: Cypress.spec.relative,
            currentRetryNumber,
          },
          { log: false }
        )
      )
      .then(({ screenshotPath, title: titleFromTask }) => {
        title = titleFromTask;
        let imgPath: string;
        return ($el ? cy.wrap($el) : cy)
          .screenshot(screenshotPath, {
            ...screenshotConfig,
            onAfterScreenshot(el, props) {
              imgPath = props.path;
              screenshotConfig.onAfterScreenshot?.(el, props);
            },
            log: false,
          })
          .then(() => cy.task(TASK.processImgPath, { path: imgPath }).then(newImgPath => imgPath = newImgPath));
      })
      .then((imgPath) =>
        cy
          .task<CompareImagesTaskReturn>(
            TASK.compareImages,
            {
              scaleFactor,
              imgNew: imgPath,
              imgOld:
                matchAgainstPath || imgPath.replace(FILE_SUFFIX.actual, ""),
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

        return {
          diffValue: res.imgDiff,
          imgNewPath: imgPath,
          imgPath: imgPath.replace(FILE_SUFFIX.actual, ""),
          imgDiffPath: imgPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
          imgNewBase64: res.imgNewBase64,
          imgBase64: res.imgOldBase64,
          imgDiffBase64: res.imgDiffBase64,
          imgNew:
            typeof res.imgNewBase64 === "string"
              ? Cypress.Buffer.from(res.imgNewBase64, "base64")
              : undefined,
          img:
            typeof res.imgOldBase64 === "string"
              ? Cypress.Buffer.from(res.imgOldBase64, "base64")
              : undefined,
          imgDiff:
            typeof res.imgDiffBase64 === "string"
              ? Cypress.Buffer.from(res.imgDiffBase64, "base64")
              : undefined,
        };
      });
  }
);
