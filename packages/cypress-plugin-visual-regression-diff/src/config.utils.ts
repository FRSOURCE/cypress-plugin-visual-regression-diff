import { supportsExpose } from './version.utils';

/** Reads a plugin option from `Cypress.expose()` or, on older Cypress, `Cypress.env()`. */
export const getExposedOption = (key: string): unknown =>
  supportsExpose(Cypress.version)
    ? (Cypress.expose(key) as unknown)
    : (Cypress.env(key) as unknown);

export const getShowPassingImagesConfig = (): boolean =>
  !!getExposedOption('pluginVisualRegressionBatchReviewModeShowPassingImages');

/**
 * Batch Review Mode is enabled by default. It is turned off only when
 * `pluginVisualRegressionBatchReviewMode` is explicitly set to `false`
 * (or the string `'false'`, as passed from the CLI).
 */
export const getBatchReviewMode = (): boolean => {
  const value = getExposedOption('pluginVisualRegressionBatchReviewMode');
  return value !== false && value !== 'false';
};
