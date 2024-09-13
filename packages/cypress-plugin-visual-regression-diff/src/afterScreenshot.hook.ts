import path from 'path';
import { promises as fs } from 'fs';
import moveFile from 'move-file';
import { IMAGE_SNAPSHOT_PREFIX, PATH_VARIABLES } from './constants';

type NotFalsy<T> = T extends false | null | undefined ? never : T;

const MIMIC_ROOT_WIN_REGEX = new RegExp(
  `^${PATH_VARIABLES.winSystemRootPath}\\${path.sep}([A-Z])\\${path.sep}`,
);
const MIMIC_ROOT_UNIX_REGEX = new RegExp(
  `^${PATH_VARIABLES.unixSystemRootPath}\\${path.sep}`,
);

const getConfigVariableOrThrow = <K extends keyof Cypress.PluginConfigOptions>(
  config: Cypress.PluginConfigOptions,
  name: K,
) => {
  if (config[name]) {
    return config[name] as NotFalsy<Cypress.PluginConfigOptions[K]>;
  }

  /* c8 ignore start */
  throw `[@frsource/cypress-plugin-visual-regression-diff] CypressConfig.${name} cannot be missing or \`false\`!`;
};
/* c8 ignore stop */

export const parseAbsolutePath = ({
  screenshotPath,
  projectRoot,
}: {
  screenshotPath: string;
  projectRoot: string;
}) => {
  let newAbsolutePath: string;
  const matchedMimicingWinRoot = screenshotPath.match(MIMIC_ROOT_WIN_REGEX);
  const matchedMimicingUnixRoot = screenshotPath.match(MIMIC_ROOT_UNIX_REGEX);
  if (matchedMimicingWinRoot && matchedMimicingWinRoot[1]) {
    const driveLetter = matchedMimicingWinRoot[1];
    newAbsolutePath = path.join(
      `${driveLetter}:\\`,
      screenshotPath.substring(matchedMimicingWinRoot[0].length),
    );
  } else if (matchedMimicingUnixRoot) {
    newAbsolutePath =
      path.sep + screenshotPath.substring(matchedMimicingUnixRoot[0].length);
  } else {
    newAbsolutePath = path.join(projectRoot, screenshotPath);
  }
  return path.normalize(newAbsolutePath);
};

export const initAfterScreenshotHook =
  (config: Cypress.PluginConfigOptions) =>
  (
    details: Cypress.ScreenshotDetails,
  ):
    | void
    | Cypress.AfterScreenshotReturnObject
    | Promise<Cypress.AfterScreenshotReturnObject> => {
    // it's not a screenshot generated by FRSOURCE Cypress Plugin Visual Regression Diff
    /* c8 ignore start */
    if (details.name?.indexOf(IMAGE_SNAPSHOT_PREFIX) !== 0) return;
    /* c8 ignore stop */
    const screenshotsFolder = getConfigVariableOrThrow(
      config,
      'screenshotsFolder',
    );
    const screenshotPath = details.name.substring(
      IMAGE_SNAPSHOT_PREFIX.length + path.sep.length,
    );
    const newAbsolutePath = parseAbsolutePath({
      screenshotPath,
      projectRoot: config.projectRoot,
    });

    return (async () => {
      await moveFile(details.path, newAbsolutePath);
      await fs.rm(path.join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX), {
        recursive: true,
        force: true,
      });

      return { path: newAbsolutePath };
    })();
  };
