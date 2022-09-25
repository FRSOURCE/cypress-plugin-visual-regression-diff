import { it, expect, describe, beforeEach, afterEach } from "vitest";
import path from "path";
import { promises as fs, existsSync } from "fs";
import { dir, file, setGracefulCleanup, withFile } from "tmp-promise";
import {
  approveImageTask,
  compareImagesTask,
  doesFileExistTask,
  getScreenshotPathInfoTask,
  CompareImagesCfg,
  cleanupImagesTask,
} from "./task.hook";
import { generateScreenshotPath } from "./screenshotPath.utils";
import { IMAGE_SNAPSHOT_PREFIX } from "./constants";

setGracefulCleanup();

const fixturesPath = path.resolve(__dirname, "..", "__tests__", "fixtures");
const oldImgFixture = "screenshot.png";
const newImgFixture = "screenshot.actual.png";
const newFileContent = "new file content";

const generateConfig = async (cfg: Partial<CompareImagesCfg>) => ({
  updateImages: false,
  scaleFactor: 1,
  title: "some title",
  imgNew: await writeTmpFixture((await file()).path, newImgFixture),
  imgOld: await writeTmpFixture((await file()).path, oldImgFixture),
  maxDiffThreshold: 0.5,
  diffConfig: {},
  ...cfg,
});
const writeTmpFixture = async (pathToWriteTo: string, fixtureName: string) => {
  await fs.writeFile(
    pathToWriteTo,
    await fs.readFile(path.join(fixturesPath, fixtureName))
  );
  return pathToWriteTo;
};

describe("getScreenshotPathInfoTask", () => {
  it("returns sanitized path and title", () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: "some-title-withśpęćiał人物",
        imagesDir: "nested/images/dir",
        specPath: "some/nested/spec-path/spec.ts",
      })
    ).toEqual({
      screenshotPath:
        "__cp-visual-regression-diff_snapshots__/some/nested/spec-path/nested/images/dir/some-title-withśpęćiał人物 #0.actual.png",
      title: "some-title-withśpęćiał人物 #0.actual",
    });
  });
});

describe("cleanupImagesTask", () => {
  describe("when env is set", () => {
    const generateUsedScreenshot = async (projectRoot: string) => {
      const screenshotPathWithPrefix = generateScreenshotPath({
        titleFromOptions: "some-file",
        imagesDir: "images",
        specPath: "some/spec/path",
      });
      const screenshotPath = path.join(
        projectRoot,
        screenshotPathWithPrefix.substring(
          IMAGE_SNAPSHOT_PREFIX.length + path.sep.length
        )
      );
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      return await writeTmpFixture(screenshotPath, "screenshot.png");
    };
    const generateUnusedScreenshot = async (projectRoot: string) => {
      const screenshotPath = path.join(projectRoot, "some-file-2 #0.png");
      return await writeTmpFixture(screenshotPath, "screenshot.png");
    };

    it("does not remove used screenshot", async () => {
      const { path: projectRoot } = await dir();
      const screenshotPath = await generateUsedScreenshot(projectRoot);

      cleanupImagesTask({
        projectRoot,
        env: { pluginVisualRegressionCleanupUnusedImages: true },
      } as unknown as Cypress.PluginConfigOptions);

      expect(existsSync(screenshotPath)).toBe(true);
    });

    it("removes unused screenshot", async () => {
      const { path: projectRoot } = await dir();
      const screenshotPath = await generateUnusedScreenshot(projectRoot);

      cleanupImagesTask({
        projectRoot,
        env: { pluginVisualRegressionCleanupUnusedImages: true },
      } as unknown as Cypress.PluginConfigOptions);

      expect(existsSync(screenshotPath)).toBe(false);
    });
  });
});

describe("approveImageTask", () => {
  let newImgPath: string;
  let oldImgPath: string;
  let diffImgPath: string;

  beforeEach(() =>
    withFile(async ({ path }) => {
      oldImgPath = path;
      newImgPath = `${oldImgPath}.actual`;
      await fs.writeFile(newImgPath, newFileContent);
      diffImgPath = `${oldImgPath}.diff`;
      await fs.writeFile(diffImgPath, "");
    })
  );
  afterEach(async () => {
    existsSync(diffImgPath) && (await fs.unlink(diffImgPath));
    existsSync(newImgPath) && (await fs.unlink(newImgPath));
  });

  it("removes diff image and replaces old with new", async () => {
    approveImageTask({ img: newImgPath });

    expect((await fs.readFile(oldImgPath)).toString()).toBe(newFileContent);
    expect(existsSync(newImgPath)).toBe(false);
    expect(existsSync(diffImgPath)).toBe(false);
  });
});

describe("compareImagesTask", () => {
  describe("when images should be updated", () => {
    describe("when old screenshot exists", () => {
      it("resolves with a success message", async () =>
        expect(
          compareImagesTask(await generateConfig({ updateImages: true }))
        ).resolves.toEqual({
          message:
            "Image diff factor (0%) is within boundaries of maximum threshold option 0.5.",
          imgDiff: 0,
          maxDiffThreshold: 0.5,
        }));
    });
  });

  describe("when images shouldn't be updated", () => {
    describe("when old screenshot doesn't exist", () => {
      it("resolves with a success message", async () => {
        const cfg = await generateConfig({ updateImages: false });
        await fs.unlink(cfg.imgOld);

        await expect(compareImagesTask(cfg)).resolves.toEqual({
          message:
            "Image diff factor (0%) is within boundaries of maximum threshold option 0.5.",
          imgDiff: 0,
          maxDiffThreshold: 0.5,
        });
      });
    });

    describe("when old screenshot exists", () => {
      describe("when new image has different resolution", () => {
        it("resolves with a error message", async () => {
          const cfg = await generateConfig({ updateImages: false });

          await expect(compareImagesTask(cfg)).resolves.toEqual({
            error: true,
            message: `Image diff factor (0.685%) is bigger than maximum threshold option 0.5.
Warning: Images size mismatch - new screenshot is 1000px by 725px while old one is 500px by 500 (width x height).`,
            imgDiff: 0.6849241379310345,
            maxDiffThreshold: 0.5,
          });
        });
      });

      describe("when new image is exactly the same as old one", () => {
        it("resolves with a success message", async () => {
          const cfg = await generateConfig({ updateImages: false });
          await writeTmpFixture(cfg.imgNew, oldImgFixture);

          await expect(compareImagesTask(cfg)).resolves.toEqual({
            message:
              "Image diff factor (0%) is within boundaries of maximum threshold option 0.5.",
            imgDiff: 0,
            maxDiffThreshold: 0.5,
          });
        });
      });
    });
  });
});

describe("doesFileExistsTask", () => {
  it("checks whether file exists", () => {
    expect(doesFileExistTask({ path: "some/random/path" })).toBe(false);
    expect(
      doesFileExistTask({ path: path.join(fixturesPath, oldImgFixture) })
    ).toBe(true);
  });
});
