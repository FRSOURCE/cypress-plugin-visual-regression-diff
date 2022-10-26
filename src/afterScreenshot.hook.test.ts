import { it, expect, describe } from "vitest";
import path from "path";
import { promises as fs, existsSync } from "fs";
import {
  initAfterScreenshotHook,
  parseAbsolutePath,
} from "./afterScreenshot.hook";
import { dir, file, setGracefulCleanup } from "tmp-promise";
import { IMAGE_SNAPSHOT_PREFIX, PATH_VARIABLES } from "./constants";

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

describe("parseAbsolutePath", () => {
  const projectRoot = "/its/project/root";

  it("resolves relative paths against project root", () => {
    expect(
      parseAbsolutePath({ screenshotPath: "some/path.png", projectRoot })
    ).toBe("/its/project/root/some/path.png");
  });

  it("builds proper win paths when found", () => {
    expect(
      parseAbsolutePath({
        screenshotPath: `${PATH_VARIABLES.winSystemRootPath}/D/some/path.png`,
        projectRoot,
      })
    )
      // that's expected output accorind to https://stackoverflow.com/a/64135721/8805801
      .toBe("D:\\/some/path.png");
  });

  it("resolves relative paths against project root", () => {
    expect(
      parseAbsolutePath({
        screenshotPath: `${PATH_VARIABLES.unixSystemRootPath}/some/path.png`,
        projectRoot,
      })
    ).toBe("/some/path.png");
  });
});
