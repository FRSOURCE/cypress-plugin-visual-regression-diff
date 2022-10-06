import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import pixelmatch, { PixelmatchOptions } from "pixelmatch";
import moveFile from "move-file";
import sanitize from "sanitize-filename";
import { FILE_SUFFIX, IMAGE_SNAPSHOT_PREFIX, TASK } from "./constants";
import { alignImagesToSameSize, importAndScaleImage } from "./image.utils";

export type CompareImagesCfg = {
  scaleFactor: number;
  title: string;
  imgNew: string;
  imgOld: string;
  updateImages: boolean;
  maxDiffThreshold: number;
  diffConfig: PixelmatchOptions;
};

const round = (n: number) => Math.ceil(n * 1000) / 1000;

const unlinkSyncSafe = (path: string) =>
  fs.existsSync(path) && fs.unlinkSync(path);
const moveSyncSafe = (pathFrom: string, pathTo: string) =>
  fs.existsSync(pathFrom) && moveFile.sync(pathFrom, pathTo);

export const getScreenshotPathTask = ({
  title,
  imagesDir,
  specPath,
}: {
  title: string;
  imagesDir: string;
  specPath: string;
}) =>
  path.join(
    IMAGE_SNAPSHOT_PREFIX,
    path.dirname(specPath),
    ...imagesDir.split("/"),
    `${sanitize(title)}${FILE_SUFFIX.actual}.png`
  );

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
): Promise<null | {
  error?: boolean;
  message?: string;
  imgDiff?: number;
  imgNewBase64?: string;
  imgDiffBase64?: string;
  imgOldBase64?: string;
  maxDiffThreshold?: number;
}> => {
  const messages = [] as string[];
  let imgDiff: number | undefined;
  let imgNewBase64: string, imgOldBase64: string, imgDiffBase64: string;
  let error = false;

  if (fs.existsSync(cfg.imgOld) && !cfg.updateImages) {
    const rawImgNew = await importAndScaleImage({
      scaleFactor: cfg.scaleFactor,
      path: cfg.imgNew,
    });
    const rawImgOld = PNG.sync.read(fs.readFileSync(cfg.imgOld));
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
    imgNewBase64 = PNG.sync.write(imgNew).toString('base64');
    imgDiffBase64 = diffBuffer.toString('base64');
    imgOldBase64 = PNG.sync.write(imgOld).toString('base64');

    if (error) {
      fs.writeFileSync(
        cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
        diffBuffer
      );
      return {
        error,
        message: messages.join("\n"),
        imgDiff,
        imgNewBase64,
        imgDiffBase64,
        imgOldBase64,
        maxDiffThreshold: cfg.maxDiffThreshold,
      };
    } else {
      // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
      fs.unlinkSync(cfg.imgNew);
    }
  } else {
    // there is no "old screenshot" or screenshots should be immediately updated
    imgDiff = 0;
    imgNewBase64 = '';
    imgDiffBase64 = '';
    imgOldBase64 = '';
    moveFile.sync(cfg.imgNew, cfg.imgOld);
  }

  if (typeof imgDiff !== "undefined") {
    messages.unshift(
      `Image diff factor (${round(
        imgDiff
      )}%) is within boundaries of maximum threshold option ${
        cfg.maxDiffThreshold
      }.`
    );
    return {
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

/* c8 ignore start */
export const initTaskHook = () => ({
  [TASK.getScreenshotPath]: getScreenshotPathTask,
  [TASK.doesFileExist]: doesFileExistTask,
  [TASK.approveImage]: approveImageTask,
  [TASK.compareImages]: compareImagesTask,
});
/* c8 ignore stop */
