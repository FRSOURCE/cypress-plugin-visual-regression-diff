import { it, expect, describe, vi } from 'vitest';
import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import { initPlugin } from './plugins';
import { resetManifest } from './manifest.utils';

vi.mock('./task.hook.ts', () => ({
  initTaskHook: vi.fn().mockReturnValue('task'),
}));
vi.mock('./afterScreenshot.hook.ts', () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue('after:screenshot'),
}));
vi.mock('./manifest.utils.ts', () => ({
  resetManifest: vi.fn(),
}));

const beforeRunHandler = (onMock: ReturnType<typeof vi.fn>) =>
  onMock.mock.calls.find(([event]) => event === 'before:run')?.[1] as
    (() => void) | undefined;

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

  it('resets the run manifest on before:run', () => {
    const onMock = vi.fn();
    const config = {
      version: '16.1.0',
      expose: {},
      env: {},
    } as unknown as Cypress.PluginConfigOptions;
    initPlugin(onMock, config);

    expect(resetManifest).not.toBeCalled();
    beforeRunHandler(onMock)?.();
    expect(resetManifest).toBeCalledWith(config);
  });
});
