import fs from 'fs';
import pixelmatch from 'pixelmatch';

type PixelmatchOptions = NonNullable<Parameters<typeof pixelmatch>[5]>;
import { moveFile } from 'move-file';
import path from 'path';
import { FILE_SUFFIX, TASK } from './constants';
import { getPluginConfig } from './version.utils';
import {
  cleanupUnused,
  decodePNG,
  encodePNG,
  getImageSize,
  scaleImage,
  isImageCurrentVersion,
  addPNGMetadata,
} from './image.utils';
import {
  generateScreenshotPath,
  resetScreenshotNameCache,
} from './screenshotPath.utils';
import type { CompareImagesTaskReturn, PendingDiffRecord } from './types';

let pendingDiffs: PendingDiffRecord[] = [];

export type CompareImagesCfg = {
  scaleFactor: number;
  title: string;
  imgNew: string;
  imgOld: string;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  maxDiffThreshold: number;
  diffConfig: PixelmatchOptions;
};

const round = (n: number) => Math.ceil(n * 1000) / 1000;

const unlinkSyncSafe = (path: string) =>
  fs.existsSync(path) && fs.unlinkSync(path);

// `.diff.png` sibling of an `.actual.png`; null when the name has no `.actual`
// suffix (only happens with hand-picked paths), so nothing else gets deleted
const diffPathFor = (actualPath: string) => {
  const diffPath = actualPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  return diffPath === actualPath ? null : diffPath;
};

const removeStaleDiff = (actualPath: string) => {
  const diffPath = diffPathFor(actualPath);
  if (diffPath) unlinkSyncSafe(diffPath);
};

export const getScreenshotPathInfoTask = (cfg: {
  titleFromOptions: string;
  imagesPath: string;
  specPath: string;
  currentRetryNumber: number;
  testId: string;
}) => {
  const screenshotPath = generateScreenshotPath(cfg);

  return { screenshotPath, title: path.basename(screenshotPath, '.png') };
};

export const cleanupImagesTask = (config: Cypress.PluginConfigOptions) => {
  if (getPluginConfig(config, 'pluginVisualRegressionCleanupUnusedImages')) {
    cleanupUnused(config);
  }

  resetScreenshotNameCache();

  return null;
};

export const approveImageTask = async ({
  img,
  imgOld,
}: {
  img: string;
  imgOld?: string;
}) => {
  const oldImg = imgOld ?? img.replace(FILE_SUFFIX.actual, '');
  unlinkSyncSafe(oldImg);

  const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  unlinkSyncSafe(diffImg);

  await moveFile(img, oldImg);

  return null;
};

export const compareImagesTask = async (
  cypressConfig: { testingType?: string },
  cfg: CompareImagesCfg,
): Promise<CompareImagesTaskReturn> => {
  const messages = [] as string[];
  // Stamp the screenshot with plugin metadata exactly once, so that every file
  // derived from it (baseline via moveFile, kept .actual.png, manual rename)
  // carries FRSOURCE_CPVRD_V and won't be silently rewritten on the next run.
  const rawImgNewBuffer = addPNGMetadata(
    cypressConfig,
    await scaleImage(fs.readFileSync(cfg.imgNew), cfg.scaleFactor),
  );
  fs.writeFileSync(cfg.imgNew, rawImgNewBuffer);
  let imgDiff: number | undefined;
  let imgNewBase64: string, imgOldBase64: string, imgDiffBase64: string;
  let error = false;

  if (fs.existsSync(cfg.imgOld) && cfg.updateImages !== true) {
    const rawImgOldBuffer = fs.readFileSync(cfg.imgOld);
    const [imgNewSize, imgOldSize] = await Promise.all([
      getImageSize(rawImgNewBuffer),
      getImageSize(rawImgOldBuffer),
    ]);
    const isImgSizeDifferent =
      imgNewSize.height !== imgOldSize.height ||
      imgNewSize.width !== imgOldSize.width;

    const size = {
      width: Math.max(imgNewSize.width, imgOldSize.width),
      height: Math.max(imgNewSize.height, imgOldSize.height),
    };
    const { width, height } = size;

    // both images are decoded straight to the common size, so the same-size
    // case is just a decode and the mismatch case pads in the same pass
    const [imgNew, imgOld] = await Promise.all([
      decodePNG(rawImgNewBuffer, imgNewSize, size),
      decodePNG(rawImgOldBuffer, imgOldSize, size),
    ]);

    const diff = Buffer.alloc(width * height * 4);
    const diffConfig = Object.assign({ includeAA: true }, cfg.diffConfig);

    const diffPixels = pixelmatch(
      imgNew,
      imgOld,
      diff,
      width,
      height,
      diffConfig,
    );
    imgDiff = diffPixels / (width * height);

    if (isImgSizeDifferent) {
      messages.push(
        `Warning: Images size mismatch - new screenshot is ${imgNewSize.width}px by ${imgNewSize.height}px while old one is ${imgOldSize.width}px by ${imgOldSize.height} (width x height).`,
      );
    }

    if (imgDiff > cfg.maxDiffThreshold) {
      messages.unshift(
        `Image diff factor (${round(
          imgDiff * 100,
        )}%) is bigger than maximum threshold option ${round(cfg.maxDiffThreshold * 100)}%.`,
      );
      error = true;
    }

    const diffBuffer = await encodePNG(diff, size);
    // the images only need re-encoding when they were padded - otherwise the
    // PNG bytes already in hand are exactly the compared image
    const [imgNewPNG, imgOldPNG] = isImgSizeDifferent
      ? await Promise.all([encodePNG(imgNew, size), encodePNG(imgOld, size)])
      : [rawImgNewBuffer, rawImgOldBuffer];
    imgNewBase64 = imgNewPNG.toString('base64');
    imgDiffBase64 = diffBuffer.toString('base64');
    imgOldBase64 = imgOldPNG.toString('base64');

    if (error && cfg.updateImages === 'failures-only') {
      await moveFile(cfg.imgNew, cfg.imgOld);
      // a diff image left by an earlier failed attempt is stale now
      removeStaleDiff(cfg.imgNew);
      error = false;
      messages[0] = messages[0].replace(
        'is bigger than maximum threshold option',
        'was bigger than maximum threshold option (baseline updated):',
      );
    } else if (error) {
      fs.writeFileSync(
        cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
        addPNGMetadata(cypressConfig, diffBuffer),
      );
    } else {
      removeStaleDiff(cfg.imgNew);
      if (!isImageCurrentVersion(rawImgOldBuffer)) {
        await moveFile(cfg.imgNew, cfg.imgOld);
      } else {
        // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
        fs.unlinkSync(cfg.imgNew);
      }
    }
  } else {
    // there is no "old screenshot" or screenshots should be immediately updated
    imgDiff = 0;
    imgNewBase64 = '';
    imgDiffBase64 = '';
    imgOldBase64 = '';
    if (cfg.createMissingImages) {
      await moveFile(cfg.imgNew, cfg.imgOld);
      removeStaleDiff(cfg.imgNew);
    } else {
      error = true;
      messages.unshift(
        `Baseline image is missing at path: "${cfg.imgOld}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
      );
    }
  }

  if (typeof imgDiff !== 'undefined') {
    if (!error) {
      messages.unshift(
        `Image diff factor (${round(
          imgDiff * 100,
        )}%) is within boundaries of maximum threshold option ${round(cfg.maxDiffThreshold * 100)}%.`,
      );
    }

    return {
      error,
      message: messages.join('\n'),
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

export const processImgPathTask = ({ path }: { path: string }) => path;

export const recordPendingDiffTask = (record: PendingDiffRecord): number => {
  pendingDiffs.push(record);
  return pendingDiffs.filter((d) => !d.passed).length;
};

export const getPendingDiffsTask = (): PendingDiffRecord[] => [...pendingDiffs];

export const clearPendingDiffsTask = (): null => {
  pendingDiffs = [];
  return null;
};

/* c8 ignore start */
export const initTaskHook = (config: Cypress.PluginConfigOptions) => ({
  [TASK.getScreenshotPathInfo]: getScreenshotPathInfoTask,
  [TASK.cleanupImages]: cleanupImagesTask.bind(undefined, config),
  [TASK.doesFileExist]: doesFileExistTask,
  [TASK.approveImage]: approveImageTask,
  [TASK.compareImages]: compareImagesTask.bind(undefined, config),
  [TASK.processImgPath]: processImgPathTask,
  [TASK.recordPendingDiff]: recordPendingDiffTask,
  [TASK.getPendingDiffs]: getPendingDiffsTask,
  [TASK.clearPendingDiffs]: clearPendingDiffsTask,
});
/* c8 ignore stop */
