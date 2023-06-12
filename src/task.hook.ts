import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch, { PixelmatchOptions } from "pixelmatch";
import moveFile from "move-file";
import path from "path";
import { FILE_SUFFIX, TASK } from "./constants";
import {
  cleanupUnused,
  alignImagesToSameSize,
  scaleImageAndWrite,
  isImageCurrentVersion,
  writePNG,
} from "./image.utils";
import {
  generateScreenshotPath,
  resetScreenshotNameCache,
} from "./screenshotPath.utils";
import type { CompareImagesTaskReturn } from "./types";

export type CompareImagesCfg = {
  scaleFactor: number;
  title: string;
  imgNew: string;
  imgOld: string;
  createMissingImages: boolean;
  updateImages: boolean;
  maxDiffThreshold: number;
  diffConfig: PixelmatchOptions;
};

const round = (n: number) => Math.ceil(n * 1000) / 1000;

const unlinkSyncSafe = (path: string) =>
  fs.existsSync(path) && fs.unlinkSync(path);
const moveSyncSafe = (pathFrom: string, pathTo: string) =>
  fs.existsSync(pathFrom) && moveFile.sync(pathFrom, pathTo);

export const getScreenshotPathInfoTask = (cfg: {
  titleFromOptions: string;
  imagesPath: string;
  specPath: string;
  currentRetryNumber: number;
}) => {
  const screenshotPath = generateScreenshotPath(cfg);

  return { screenshotPath, title: path.basename(screenshotPath, ".png") };
};

export const cleanupImagesTask = (config: Cypress.PluginConfigOptions) => {
  if (config.env["pluginVisualRegressionCleanupUnusedImages"]) {
    cleanupUnused(config.projectRoot);
  }

  resetScreenshotNameCache();

  return null;
};

export const approveImageTask = ({ img }: { img: string }) => {
  const oldImg = img.replace(FILE_SUFFIX.actual, "");
  unlinkSyncSafe(oldImg);

  const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  unlinkSyncSafe(diffImg);

  moveSyncSafe(img, oldImg);

  return null;
};

export const compareImagesTask = async (
  cfg: CompareImagesCfg
): Promise<CompareImagesTaskReturn> => {
  const messages = [] as string[];
  const rawImgNewBuffer = await scaleImageAndWrite({
    scaleFactor: cfg.scaleFactor,
    path: cfg.imgNew,
  });
  let imgDiff: number | undefined;
  let imgNewBase64: string, imgOldBase64: string, imgDiffBase64: string;
  let error = false;

  if (fs.existsSync(cfg.imgOld) && !cfg.updateImages) {
    const rawImgNew = PNG.sync.read(rawImgNewBuffer);
    const rawImgOldBuffer = fs.readFileSync(cfg.imgOld);
    const rawImgOld = PNG.sync.read(rawImgOldBuffer);
    const isImgSizeDifferent =
      rawImgNew.height !== rawImgOld.height ||
      rawImgNew.width !== rawImgOld.width;

    const [imgNew, imgOld] = isImgSizeDifferent
      ? alignImagesToSameSize(rawImgNew, rawImgOld)
      : [rawImgNew, rawImgOld];

    const { width, height } = imgNew;
    const diff = new PNG({ width, height });
    const diffConfig = Object.assign({ includeAA: true }, cfg.diffConfig);

    const diffPixels = pixelmatch(
      imgNew.data,
      imgOld.data,
      diff.data,
      width,
      height,
      diffConfig
    );
    imgDiff = diffPixels / (width * height);

    if (isImgSizeDifferent) {
      messages.push(
        `Warning: Images size mismatch - new screenshot is ${rawImgNew.width}px by ${rawImgNew.height}px while old one is ${rawImgOld.width}px by ${rawImgOld.height} (width x height).`
      );
    }

    if (imgDiff > cfg.maxDiffThreshold) {
      messages.unshift(
        `Image diff factor (${round(
          imgDiff
        )}%) is bigger than maximum threshold option ${cfg.maxDiffThreshold}.`
      );
      error = true;
    }

    const diffBuffer = PNG.sync.write(diff);
    imgNewBase64 = PNG.sync.write(imgNew).toString("base64");
    imgDiffBase64 = diffBuffer.toString("base64");
    imgOldBase64 = PNG.sync.write(imgOld).toString("base64");

    if (error) {
      writePNG(
        cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
        diffBuffer
      );
    } else {
      if (rawImgOld && !isImageCurrentVersion(rawImgOldBuffer)) {
        writePNG(cfg.imgNew, rawImgNewBuffer);
        moveFile.sync(cfg.imgNew, cfg.imgOld);
      } else {
        // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
        fs.unlinkSync(cfg.imgNew);
      }
    }
  } else {
    // there is no "old screenshot" or screenshots should be immediately updated
    imgDiff = 0;
    imgNewBase64 = "";
    imgDiffBase64 = "";
    imgOldBase64 = "";
    if (cfg.createMissingImages) {
      writePNG(cfg.imgNew, rawImgNewBuffer);
      moveFile.sync(cfg.imgNew, cfg.imgOld);
    } else {
      error = true;
      messages.unshift(
        `Baseline image is missing at path: "${cfg.imgOld}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`
      );
    }
  }

  if (typeof imgDiff !== "undefined") {
    if (!error) {
      messages.unshift(
        `Image diff factor (${round(
          imgDiff
        )}%) is within boundaries of maximum threshold option ${
          cfg.maxDiffThreshold
        }.`
      );
    }

    return {
      error,
      message: messages.join("\n"),
      imgDiff,
      imgNewBase64,
      imgDiffBase64,
      imgOldBase64,
      maxDiffThreshold: cfg.maxDiffThreshold,
    };
  }

  /* c8 ignore next */
  return null;
};

export const doesFileExistTask = ({ path }: { path: string }) =>
  fs.existsSync(path);

export const processImgPath = ({ path: string }) => path;

/* c8 ignore start */
export const initTaskHook = (config: Cypress.PluginConfigOptions) => ({
  [TASK.getScreenshotPathInfo]: getScreenshotPathInfoTask,
  [TASK.cleanupImages]: cleanupImagesTask.bind(undefined, config),
  [TASK.doesFileExist]: doesFileExistTask,
  [TASK.approveImage]: approveImageTask,
  [TASK.compareImages]: compareImagesTask,
  [TASK.processImgPath]: processImgPath,
});
/* c8 ignore stop */
