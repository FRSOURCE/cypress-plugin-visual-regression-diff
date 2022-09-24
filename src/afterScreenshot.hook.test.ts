import { it, expect, describe } from "vitest";
import path from "path";
import { promises as fs, existsSync } from "fs";
import { initAfterScreenshotHook } from "@/afterScreenshot.hook";
import { dir, file, setGracefulCleanup } from "tmp-promise";
import { IMAGE_SNAPSHOT_PREFIX } from "@/constants";

setGracefulCleanup();

describe("initAfterScreenshotHook", () => {
  it("move file and remove old directories", async () => {
    const { path: screenshotsFolder } = await dir();
    const imagesFolder = path.join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX);
    await fs.mkdir(imagesFolder);
    const { path: imgPath } = await file();
    const projectRoot = path.dirname(imgPath);

    await initAfterScreenshotHook({
      screenshotsFolder,
      projectRoot,
    } as Cypress.PluginConfigOptions)({
      name: IMAGE_SNAPSHOT_PREFIX + path.sep + "some_name",
      path: imgPath,
    } as Cypress.ScreenshotDetails);

    const expectedNewPath = path.join(projectRoot, "some_name");
    expect(existsSync(imagesFolder)).toBe(false);
    expect(existsSync(imgPath)).toBe(false);
    expect(existsSync(expectedNewPath)).toBe(true);

    await fs.unlink(expectedNewPath);
  });
});
