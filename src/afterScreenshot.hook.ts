import path from "path";
import fs from "fs";
import moveFile from "move-file";
import { IMAGE_SNAPSHOT_PREFIX } from "@/constants";

type NotFalsy<T> = T extends false | null | undefined ? never : T;

const getConfigVariableOrThrow = <K extends keyof Cypress.PluginConfigOptions>(
  config: Cypress.PluginConfigOptions,
  name: K
) => {
  if (config[name]) {
    return config[name] as NotFalsy<Cypress.PluginConfigOptions[K]>;
  }

  /* c8 ignore start */
  throw `[Image snapshot] CypressConfig.${name} cannot be missing or \`false\`!`;
};
/* c8 ignore stop */

const removeScreenshotsDirectory = (
  screenshotsFolder: string,
  onSuccess: () => void,
  onError: (e: Error) => void
) => {
  fs.rm(
    path.join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX),
    { recursive: true, force: true },
    (err) => {
      /* c8 ignore start */
      if (err) return onError(err);
      /* c8 ignore stop */
      onSuccess();
    }
  );
};

export const initAfterScreenshotHook =
  (config: Cypress.PluginConfigOptions) =>
  (
    details: Cypress.ScreenshotDetails
  ):
    | void
    | Cypress.AfterScreenshotReturnObject
    | Promise<Cypress.AfterScreenshotReturnObject> => {
    /* c8 ignore start */
    if (details.name?.indexOf(IMAGE_SNAPSHOT_PREFIX) !== 0) return;
    /* c8 ignore stop */
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
