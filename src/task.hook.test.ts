import { it, expect, describe, beforeEach, afterEach } from "vitest";
import path from "path";
import { promises as fs, existsSync } from "fs";
import {
  approveImageTask,
  compareImagesTask,
  doesFileExistTask,
  getScreenshotPathTask,
  CompareImagesCfg,
} from "./task.hook";
import { file, setGracefulCleanup, withFile } from "tmp-promise";

setGracefulCleanup();

const fixturesPath = path.resolve(__dirname, "..", "__tests__", "fixtures");
const newFileContent = "new file content";

const writeTmpFixture = async (pathToWriteTo: string, fixtureName: string) =>
  fs.writeFile(
    pathToWriteTo,
    await fs.readFile(path.join(fixturesPath, fixtureName))
  );

describe("getScreenshotPathTask", () => {
  it("returns sanitized path", () => {
    expect(
      getScreenshotPathTask({
        title: "some-title-withśpęćiał人物",
        imagesDir: "nested/images/dir",
        specPath: "some/nested/spec-path/spec.ts",
      })
    ).toBe(
      "__cp-visual-regression-diff_snapshots__/some/nested/spec-path/nested/images/dir/some-title-withśpęćiał人物.actual.png"
    );
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
  const title = "some title";
  const generateConfig = async (cfg: Partial<CompareImagesCfg>) => ({
    updateImages: false,
    scaleFactor: 1,
    title,
    imgNew: (await file()).path,
    imgOld: (await file()).path,
    maxDiffThreshold: 0.5,
    diffConfig: {},
    ...cfg,
  });

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
          await writeTmpFixture(cfg.imgOld, "screenshot.png");
          await writeTmpFixture(cfg.imgNew, "screenshot.actual.png");

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
          await writeTmpFixture(cfg.imgOld, "screenshot.png");
          await writeTmpFixture(cfg.imgNew, "screenshot.png");

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
      doesFileExistTask({ path: path.join(fixturesPath, "screenshot.png") })
    ).toBe(true);
  });
});
