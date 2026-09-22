import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { getPluginConfig } from './version.utils';
import {
  initManifestRun,
  resetManifest,
  setManifestBrowser,
} from './manifest.utils';

export type {
  Manifest,
  ManifestBrowser,
  ManifestCi,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestImage,
  ManifestPlatform,
  ManifestRunner,
  ManifestStatus,
} from './types';

/* c8 ignore start */
const applyForceDeviceScaleFactor = (
  browser: Cypress.Browser,
  launchOptions: Cypress.BeforeBrowserLaunchOptions,
) => {
  // based on https://github.com/cypress-io/cypress/issues/2102#issuecomment-521299946
  if (browser.name === 'chrome' || browser.name === 'chromium') {
    launchOptions.args.push('--force-device-scale-factor=1');
    launchOptions.args.push('--high-dpi-support=1');
  } else if (browser.name === 'electron' && browser.isHeaded) {
    // eslint-disable-next-line no-console
    console.log(
      "There isn't currently a way of setting the device scale factor in Cypress when running headed electron so we disable the image regression commands.",
    );
  }
};
/* c8 ignore stop */

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  const forceDeviceScaleFactor =
    getPluginConfig(config, 'pluginVisualRegressionForceDeviceScaleFactor') !==
    false;

  // Cypress calls a single handler per event, so everything the plugin needs
  // from the browser launch lives here
  on('before:browser:launch', (browser, launchOptions) => {
    setManifestBrowser(config, browser);
    /* c8 ignore next */
    if (forceDeviceScaleFactor)
      applyForceDeviceScaleFactor(browser, launchOptions);
    return launchOptions;
  });
  on('task', initTaskHook(config));
  on('after:screenshot', initAfterScreenshotHook(config));
  // start every run with a fresh manifest (run mode only; `cypress open` keeps
  // the entries and overwrites them per screenshot)
  on('before:run', (details) => resetManifest(config, details));
  // `before:run` does not fire in `cypress open`, so seed the run data now
  initManifestRun(config);
};
