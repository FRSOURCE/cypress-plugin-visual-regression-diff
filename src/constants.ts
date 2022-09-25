const PLUGIN_NAME = "cp-visual-regression-diff";
export const LINK_PREFIX = `#${PLUGIN_NAME}-`;
export const OVERLAY_CLASS = `${PLUGIN_NAME}-overlay`;
export const IMAGE_SNAPSHOT_PREFIX = `__${PLUGIN_NAME}_snapshots__`;

export enum FILE_SUFFIX {
  diff = ".diff",
  actual = ".actual",
}

export const TASK = {
  getScreenshotPathInfo: `${PLUGIN_NAME}-getScreenshotPathInfo`,
  compareImages: `${PLUGIN_NAME}-compareImages`,
  approveImage: `${PLUGIN_NAME}-approveImage`,
  cleanupImages: `${PLUGIN_NAME}-cleanupImages`,
  doesFileExist: `${PLUGIN_NAME}-doesFileExist`,
  /* c8 ignore next */
};

export const METADATA_KEY = "FRSOURCE_CPVRD_V";
