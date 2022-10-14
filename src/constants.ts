const PLUGIN_NAME = "cp-visual-regression-diff";
export const LINK_PREFIX = `#${PLUGIN_NAME}-`;
export const OVERLAY_CLASS = `${PLUGIN_NAME}-overlay`;
export const IMAGE_SNAPSHOT_PREFIX = `__${PLUGIN_NAME}_snapshots__`;

export enum FILE_SUFFIX {
  diff = ".diff",
  actual = ".actual",
}

export const TASK = {
  getScreenshotPath: `${PLUGIN_NAME}-getScreenshotPath`,
  compareImages: `${PLUGIN_NAME}-compareImages`,
  approveImage: `${PLUGIN_NAME}-approveImage`,
  doesFileExist: `${PLUGIN_NAME}-doesFileExist`,
  /* c8 ignore next */
};

export const PATH_VARIABLES = {
  specPath: "{spec_path}",
  unixSystemRootPath: "{unix_system_root_path}",
  winSystemRootPath: "{win_system_root_path}",
};

export const WINDOWS_LIKE_DRIVE_REGEX = /^[A-Z]:$/;
