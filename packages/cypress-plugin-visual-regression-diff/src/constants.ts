const PLUGIN_NAME = 'cp-visual-regression-diff';
export const LINK_PREFIX = `#${PLUGIN_NAME}-`;
export const OVERLAY_CLASS = `${PLUGIN_NAME}-overlay`;
export const FAB_CLASS = `${PLUGIN_NAME}-fab`;
export const FAB_BADGE_CLASS = `${PLUGIN_NAME}-fab-badge`;
export const IMAGE_SNAPSHOT_PREFIX = `__${PLUGIN_NAME}_snapshots__`;

export enum FILE_SUFFIX {
  diff = '.diff',
  actual = '.actual',
}

export const TASK = {
  getScreenshotPathInfo: `${PLUGIN_NAME}-getScreenshotPathInfo`,
  compareImages: `${PLUGIN_NAME}-compareImages`,
  approveImage: `${PLUGIN_NAME}-approveImage`,
  cleanupImages: `${PLUGIN_NAME}-cleanupImages`,
  doesFileExist: `${PLUGIN_NAME}-doesFileExist`,
  processImgPath: `${PLUGIN_NAME}-processImgPath`,
  recordPendingDiff: `${PLUGIN_NAME}-recordPendingDiff`,
  getPendingDiffs: `${PLUGIN_NAME}-getPendingDiffs`,
  clearPendingDiffs: `${PLUGIN_NAME}-clearPendingDiffs`,
  /* c8 ignore next */
};

export const PATH_VARIABLES = {
  specPath: '{spec_path}',
  unixSystemRootPath: '{unix_system_root_path}',
  winSystemRootPath: '{win_system_root_path}',
} as const;

export const WINDOWS_LIKE_DRIVE_REGEX = /^[A-Z]:$/;

export const METADATA_KEY = 'FRSOURCE_CPVRD_V';
