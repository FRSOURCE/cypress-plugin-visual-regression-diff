import { it, expect, describe, vi } from "vitest";
import { initTaskHook } from "./task.hook";
import { initAfterScreenshotHook } from "./afterScreenshot.hook";
import { initPlugin } from "./plugins";

vi.mock("./task.hook.ts", () => ({
  initTaskHook: vi.fn().mockReturnValue("task"),
}));
vi.mock("./afterScreenshot.hook.ts", () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue("after:screenshot"),
}));

describe("initPlugin", () => {
  it("inits hooks", () => {
    const onMock = vi.fn();
    initPlugin(onMock, {
      env: { pluginVisualRegressionForceDeviceScaleFactor: false },
    } as unknown as Cypress.PluginConfigOptions);

    expect(onMock).toBeCalledWith("task", "task");
    expect(onMock).toBeCalledWith("after:screenshot", "after:screenshot");
    expect(initTaskHook).toBeCalledTimes(1);
    expect(initAfterScreenshotHook).toBeCalledTimes(1);
  });
});
