import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initBrowserLaunchHook } from './browserLaunch.utils';
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

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  // Cypress keeps a single listener per event, so the launch presets
  // (forceDeviceScaleFactor, deterministicRendering) and the manifest's
  // record of the launched browser have to share one handler
  const launchHook = initBrowserLaunchHook(config);
  on('before:browser:launch', (browser, launchOptions) => {
    setManifestBrowser(config, browser);
    return launchHook(browser, launchOptions);
  });
  on('task', initTaskHook(config));
  on('after:screenshot', initAfterScreenshotHook(config));
  // start every run with a fresh manifest (run mode only; `cypress open` keeps
  // the entries and overwrites them per screenshot)
  on('before:run', (details) => resetManifest(config, details));
  // `before:run` does not fire in `cypress open`, so seed the run data now
  initManifestRun(config);
};
