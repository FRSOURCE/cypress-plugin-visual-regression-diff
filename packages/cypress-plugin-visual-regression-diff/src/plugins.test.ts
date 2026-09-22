import { it, expect, describe, vi } from 'vitest';
import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initBrowserLaunchHook } from './browserLaunch.utils';
import { initPlugin } from './plugins';

vi.mock('./task.hook.ts', () => ({
  initTaskHook: vi.fn().mockReturnValue('task'),
}));
vi.mock('./afterScreenshot.hook.ts', () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue('after:screenshot'),
}));
vi.mock('./browserLaunch.utils.ts', () => ({
  initBrowserLaunchHook: vi.fn().mockReturnValue('before:browser:launch'),
}));

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
    vi.clearAllMocks();
    const onMock = vi.fn();
    const pluginConfig = config as unknown as Cypress.PluginConfigOptions;

    initPlugin(onMock, pluginConfig);

    expect(onMock).toBeCalledTimes(3);
    expect(onMock).toBeCalledWith(
      'before:browser:launch',
      'before:browser:launch',
    );
    expect(onMock).toBeCalledWith('task', 'task');
    expect(onMock).toBeCalledWith('after:screenshot', 'after:screenshot');
    expect(initBrowserLaunchHook).toBeCalledWith(pluginConfig);
    expect(initTaskHook).toBeCalledWith(pluginConfig);
    expect(initAfterScreenshotHook).toBeCalledWith(pluginConfig);
  });
});
