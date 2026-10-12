import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initBrowserLaunchHook } from './browserLaunch.utils';

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  // one handler serves both presets (forceDeviceScaleFactor, deterministicRendering):
  // Cypress keeps a single listener per event, so they have to share it
  on('before:browser:launch', initBrowserLaunchHook(config));
  on('task', initTaskHook(config));
  on('after:screenshot', initAfterScreenshotHook(config));
};
