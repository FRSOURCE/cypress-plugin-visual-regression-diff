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
};
