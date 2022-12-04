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
  await fs.mkdir(path.dirname(pathToWriteTo), { recursive: true });
  await fs.writeFile(
    pathToWriteTo,
    await fs.readFile(path.join(fixturesPath, fixtureName))
  );
  return pathToWriteTo;
};

describe("getScreenshotPathInfoTask", () => {
  const specPath = "some/nested/spec-path/spec.ts";

  it("returns sanitized path and title", () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: "some-title-withśpęćiał人物",
        imagesPath: "nested/images/dir",
        specPath,
        currentRetryNumber: 0,
      })
    ).toEqual({
      screenshotPath:
        "__cp-visual-regression-diff_snapshots__/nested/images/dir/some-title-withśpęćiał人物_#0.actual.png",
      title: "some-title-withśpęćiał人物_#0.actual",
    });
  });

  it("supports {spec_path} variable", () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: "some-title",
        imagesPath: "{spec_path}/images/dir",
        specPath,
        currentRetryNumber: 0,
      })
    ).toEqual({
      screenshotPath:
        "__cp-visual-regression-diff_snapshots__/some/nested/spec-path/images/dir/some-title_#0.actual.png",
      title: "some-title_#0.actual",
    });
  });

  it("supports OS-specific absolute paths", () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: "some-title",
        imagesPath: "/images/dir",
        specPath,
        currentRetryNumber: 0,
      })
    ).toEqual({
      screenshotPath:
        "__cp-visual-regression-diff_snapshots__/{unix_system_root_path}/images/dir/some-title_#0.actual.png",
      title: "some-title_#0.actual",
    });

    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: "some-title",
        imagesPath: "C:/images/dir",
        specPath,
        currentRetryNumber: 0,
      })
    ).toEqual({
      screenshotPath:
        "__cp-visual-regression-diff_snapshots__/{win_system_root_path}/C/images/dir/some-title_#0.actual.png",
      title: "some-title_#0.actual",
    });
  });
});

describe("cleanupImagesTask", () => {
  describe("when env is set", () => {
    const generateUsedScreenshotPath = async (projectRoot: string) => {
      const screenshotPathWithPrefix = generateScreenshotPath({
        titleFromOptions: "some-file",
        imagesPath: "images",
        specPath: "some/spec/path",
        currentRetryNumber: 0,
      });
      return path.join(
        projectRoot,
        screenshotPathWithPrefix.substring(
          IMAGE_SNAPSHOT_PREFIX.length + path.sep.length
        )
      );
    };

    it("does not remove used screenshot", async () => {
      const { path: projectRoot } = await dir();
      const screenshotPath = await writeTmpFixture(
        await generateUsedScreenshotPath(projectRoot),
        oldImgFixture
      );

      cleanupImagesTask({
        projectRoot,
        env: { pluginVisualRegressionCleanupUnusedImages: true },
      } as unknown as Cypress.PluginConfigOptions);

      expect(existsSync(screenshotPath)).toBe(true);
    });

    it("removes unused screenshot", async () => {
      const { path: projectRoot } = await dir();
      const screenshotPath = await writeTmpFixture(
        path.join(projectRoot, "some-file-2_#0.png"),
        oldImgFixture
      );

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
          imgDiffBase64: "",
          imgNewBase64: "",
          imgOldBase64: "",
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
          imgDiffBase64: "",
          imgNewBase64: "",
          imgOldBase64: "",
          maxDiffThreshold: 0.5,
        });
      });
    });

    describe("when old screenshot exists", () => {
      describe("when new image has different resolution", () => {
        it("resolves with an error message", async () => {
          const cfg = await generateConfig({ updateImages: false });

          await expect(compareImagesTask(cfg)).resolves.toMatchSnapshot();
        });
      });

      describe("when new image is exactly the same as old one", () => {
        it("resolves with a success message", async () => {
          const cfg = await generateConfig({ updateImages: false });
          await writeTmpFixture(cfg.imgNew, oldImgFixture);

          await expect(compareImagesTask(cfg)).resolves.toMatchSnapshot();
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
