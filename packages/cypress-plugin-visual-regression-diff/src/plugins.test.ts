import { it, expect, describe, vi } from 'vitest';
import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initPlugin } from './plugins';
import {
  initManifestRun,
  resetManifest,
  setManifestBrowser,
} from './manifest.utils';

vi.mock('./task.hook.ts', () => ({
  initTaskHook: vi.fn().mockReturnValue('task'),
}));
vi.mock('./afterScreenshot.hook.ts', () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue('after:screenshot'),
}));
vi.mock('./manifest.utils.ts', () => ({
  initManifestRun: vi.fn(),
  resetManifest: vi.fn(),
  setManifestBrowser: vi.fn(),
}));

const handler = <T>(onMock: ReturnType<typeof vi.fn>, event: string) =>
  onMock.mock.calls.find(([name]) => name === event)?.[1] as T | undefined;
const beforeRunHandler = (onMock: ReturnType<typeof vi.fn>) =>
  handler<(details: unknown) => void>(onMock, 'before:run');
const browserLaunchHandler = (onMock: ReturnType<typeof vi.fn>) =>
  handler<
    (
      browser: Cypress.Browser,
      launchOptions: Cypress.BeforeBrowserLaunchOptions,
    ) => Cypress.BeforeBrowserLaunchOptions
  >(onMock, 'before:browser:launch');

describe('initPlugin', () => {
  it('inits hooks (Cypress <15.10, env API)', () => {
    const onMock = vi.fn();
    initPlugin(onMock, {
      version: '13.17.0',
      env: { pluginVisualRegressionForceDeviceScaleFactor: false },
    } as unknown as Cypress.PluginConfigOptions);

    expect(onMock).toBeCalledWith('task', 'task');
    expect(onMock).toBeCalledWith('after:screenshot', 'after:screenshot');
    expect(onMock).toBeCalledWith('before:run', expect.any(Function));
    expect(onMock).toBeCalledWith(
      'before:browser:launch',
      expect.any(Function),
    );
    expect(initTaskHook).toBeCalledTimes(1);
    expect(initAfterScreenshotHook).toBeCalledTimes(1);
  });

  it('inits hooks (Cypress 15.10+, expose API)', () => {
    const onMock = vi.fn();
    initPlugin(onMock, {
      version: '15.10.0',
      expose: { pluginVisualRegressionForceDeviceScaleFactor: false },
      env: {},
    } as unknown as Cypress.PluginConfigOptions);

    expect(onMock).toBeCalledWith('task', 'task');
    expect(onMock).toBeCalledWith('after:screenshot', 'after:screenshot');
    expect(onMock).toBeCalledWith('before:run', expect.any(Function));
    expect(initTaskHook).toBeCalledTimes(2);
    expect(initAfterScreenshotHook).toBeCalledTimes(2);
  });

  it('seeds the run manifest on init and resets it with the details on before:run', () => {
    const onMock = vi.fn();
    const config = {
      version: '16.1.0',
      expose: {},
      env: {},
    } as unknown as Cypress.PluginConfigOptions;
    initPlugin(onMock, config);

    expect(initManifestRun).toBeCalledWith(config);
    expect(resetManifest).not.toBeCalled();
    const details = { specs: [] };
    beforeRunHandler(onMock)?.(details);
    expect(resetManifest).toBeCalledWith(config, details);
  });

  it('records the launched browser in the manifest on before:browser:launch', () => {
    const onMock = vi.fn();
    const config = {
      version: '16.1.0',
      expose: { pluginVisualRegressionForceDeviceScaleFactor: false },
      env: {},
    } as unknown as Cypress.PluginConfigOptions;
    initPlugin(onMock, config);

    const browser = { name: 'firefox', version: '131' } as Cypress.Browser;
    const launchOptions = {
      args: [],
    } as unknown as Cypress.BeforeBrowserLaunchOptions;
    expect(browserLaunchHandler(onMock)?.(browser, launchOptions)).toBe(
      launchOptions,
    );
    expect(setManifestBrowser).toBeCalledWith(config, browser);
    // the scale-factor flags are off for this config, so the args stay untouched
    expect(launchOptions.args).toEqual([]);
  });
});
