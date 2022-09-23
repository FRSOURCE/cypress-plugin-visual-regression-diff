import path from "path";
import fs from "fs";
import moveFile from "move-file";
import { IMAGE_SNAPSHOT_PREFIX } from "@/constants";
import { initTasks } from "@/tasks";

type NotFalsy<T> = T extends false | null | undefined ? never : T;

const getConfigVariableOrThrow = <K extends keyof Cypress.PluginConfigOptions>(
  config: Cypress.PluginConfigOptions,
  name: K
) => {
  if (config[name])
    return config[name] as NotFalsy<Cypress.PluginConfigOptions[K]>;

  throw `[Image snapshot] CypressConfig.${name} cannot be missing or \`false\`!`;
};

const initForceDeviceScaleFactor = (on: Cypress.PluginEvents) => {
  // based on https://github.com/cypress-io/cypress/issues/2102#issuecomment-521299946
  on("before:browser:launch", (browser, launchOptions) => {
    if (browser.name === "chrome" || browser.name === "chromium") {
      launchOptions.args.push("--force-device-scale-factor=1");
      launchOptions.args.push("--high-dpi-support=1");
    } else if (browser.name === "electron" && browser.isHeaded) {
      // eslint-disable-next-line no-console
      console.log(
        "There isn't currently a way of setting the device scale factor in Cypress when running headed electron so we disable the image regression commands."
      );
    }
  });
};

const removeScreenshotsDirectory = (
  screenshotsFolder: string,
  onSuccess: () => void,
  onError: (e: Error) => void
) => {
  fs.rm(
    path.join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX),
    { recursive: true, force: true },
    (err) => {
      if (err) return onError(err);

      onSuccess();
    }
  );
};

const initAfterScreenshotHook =
  (
    config: Cypress.PluginConfigOptions
  ): ((
    details: Cypress.ScreenshotDetails
  ) =>
    | void
    | Cypress.AfterScreenshotReturnObject
    | Promise<Cypress.AfterScreenshotReturnObject>) =>
  (details) => {
    if (details.name?.indexOf(IMAGE_SNAPSHOT_PREFIX) !== 0) return;

    return new Promise((resolve, reject) => {
      const screenshotsFolder = getConfigVariableOrThrow(
        config,
        "screenshotsFolder"
      );

      const newRelativePath = details.name.substring(
        IMAGE_SNAPSHOT_PREFIX.length + path.sep.length
      );
      const newAbsolutePath = path.normalize(
        path.join(config.projectRoot, newRelativePath)
      );

      void moveFile(details.path, newAbsolutePath)
        .then(() =>
          removeScreenshotsDirectory(
            screenshotsFolder,
            () => resolve({ path: newAbsolutePath }),
            reject
          )
        )
        .catch(reject);
    });
  };

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) => {
  if (config.env["pluginVisualRegressionForceDeviceScaleFactor"] !== false) {
    initForceDeviceScaleFactor(on);
  }

  on("task", initTasks());
  on("after:screenshot", initAfterScreenshotHook(config));
};
