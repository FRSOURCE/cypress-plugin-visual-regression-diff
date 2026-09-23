import { it, expect, describe, vi, beforeEach } from 'vitest';
import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initBrowserLaunchHook } from './browserLaunch.utils';
import {
  initManifestRun,
  resetManifest,
  setManifestBrowser,
} from './manifest.utils';
import { initPlugin } from './plugins';

const launchHook = vi.fn();

vi.mock('./task.hook.ts', () => ({
  initTaskHook: vi.fn().mockReturnValue('task'),
}));
vi.mock('./afterScreenshot.hook.ts', () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue('after:screenshot'),
}));
vi.mock('./browserLaunch.utils.ts', () => ({
  initBrowserLaunchHook: vi.fn(() => launchHook),
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

const pluginConfig = (config: Record<string, unknown>) =>
  config as unknown as Cypress.PluginConfigOptions;

beforeEach(() => vi.clearAllMocks());

describe('initPlugin', () => {
  it.each([
    {
      api: 'env (Cypress <15.10)',
      config: {
        version: '13.17.0',
        env: { pluginVisualRegressionForceDeviceScaleFactor: false },
      },
    },
    {
      api: 'expose (Cypress 15.10+)',
      config: {
        version: '15.10.0',
        expose: { pluginVisualRegressionForceDeviceScaleFactor: false },
        env: {},
      },
    },
  ])('registers every hook exactly once with the $api config', ({ config }) => {
    const onMock = vi.fn();
    const cfg = pluginConfig(config);

    initPlugin(onMock, cfg);

    expect(onMock).toHaveBeenCalledTimes(4);
    expect(onMock).toHaveBeenCalledWith(
      'before:browser:launch',
      expect.any(Function),
    );
    expect(onMock).toHaveBeenCalledWith('task', 'task');
    expect(onMock).toHaveBeenCalledWith('after:screenshot', 'after:screenshot');
    expect(onMock).toHaveBeenCalledWith('before:run', expect.any(Function));
    expect(initBrowserLaunchHook).toHaveBeenCalledWith(cfg);
    expect(initTaskHook).toHaveBeenCalledWith(cfg);
    expect(initAfterScreenshotHook).toHaveBeenCalledWith(cfg);
  });

  it('seeds the run manifest on init and resets it with the details on before:run', () => {
    const onMock = vi.fn();
    const cfg = pluginConfig({ version: '16.1.0', expose: {}, env: {} });
    initPlugin(onMock, cfg);

    expect(initManifestRun).toHaveBeenCalledWith(cfg);
    expect(resetManifest).not.toHaveBeenCalled();
    const details = { specs: [] };
    beforeRunHandler(onMock)?.(details);
    expect(resetManifest).toHaveBeenCalledWith(cfg, details);
  });

  it('records the launched browser in the manifest, then applies the launch presets', () => {
    const onMock = vi.fn();
    const cfg = pluginConfig({ version: '16.1.0', expose: {}, env: {} });
    initPlugin(onMock, cfg);

    const browser = { name: 'firefox', version: '131' } as Cypress.Browser;
    const launchOptions = {
      args: [],
    } as unknown as Cypress.BeforeBrowserLaunchOptions;
    const fromPresets = { args: ['--from-presets'] };
    launchHook.mockReturnValueOnce(fromPresets);

    expect(browserLaunchHandler(onMock)?.(browser, launchOptions)).toBe(
      fromPresets,
    );
    expect(setManifestBrowser).toHaveBeenCalledWith(cfg, browser);
    expect(launchHook).toHaveBeenCalledWith(browser, launchOptions);
    expect(setManifestBrowser.mock.invocationCallOrder[0]).toBeLessThan(
      launchHook.mock.invocationCallOrder[0],
    );
  });
});
