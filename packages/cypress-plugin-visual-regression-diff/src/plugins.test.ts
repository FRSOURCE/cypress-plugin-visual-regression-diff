import { it, expect, describe, vi } from 'vitest';
import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initPlugin } from './plugins';

vi.mock('./task.hook.ts', () => ({
  initTaskHook: vi.fn().mockReturnValue('task'),
}));
vi.mock('./afterScreenshot.hook.ts', () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue('after:screenshot'),
}));

describe('initPlugin', () => {
  it('inits hooks (Cypress <15.10, env API)', () => {
    const onMock = vi.fn();
    initPlugin(onMock, {
      version: '13.17.0',
      env: { pluginVisualRegressionForceDeviceScaleFactor: false },
    } as unknown as Cypress.PluginConfigOptions);

    expect(onMock).toBeCalledWith('task', 'task');
    expect(onMock).toBeCalledWith('after:screenshot', 'after:screenshot');
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
    expect(initTaskHook).toBeCalledTimes(2);
    expect(initAfterScreenshotHook).toBeCalledTimes(2);
  });
});
