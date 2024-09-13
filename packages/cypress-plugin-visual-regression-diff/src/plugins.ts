import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';

/* c8 ignore start */
const initForceDeviceScaleFactor = (on: Cypress.PluginEvents) => {
  // based on https://github.com/cypress-io/cypress/issues/2102#issuecomment-521299946
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'chrome' || browser.name === 'chromium') {
      launchOptions.args.push('--force-device-scale-factor=1');
      launchOptions.args.push('--high-dpi-support=1');
      return launchOptions;
    } else if (browser.name === 'electron' && browser.isHeaded) {
      // eslint-disable-next-line no-console
      console.log(
        "There isn't currently a way of setting the device scale factor in Cypress when running headed electron so we disable the image regression commands.",
      );
    }
  });
};
/* c8 ignore stop */

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  /* c8 ignore start */
  if (config.env['pluginVisualRegressionForceDeviceScaleFactor'] !== false) {
    initForceDeviceScaleFactor(on);
  }
  /* c8 ignore stop */
  on('task', initTaskHook(config));
  on('after:screenshot', initAfterScreenshotHook(config));
};
