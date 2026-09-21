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
  padImageToSize,
  scaleImageAndWrite,
  isImageCurrentVersion,
  addPNGMetadata,
  writePNG,
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

// view over the same memory, no copy
const asUint8Array = (buf: Buffer) =>
  new Uint8Array(buf.buffer, buf.byteOffset, buf.length);

export const getScreenshotPathInfoTask = (cfg: {
  titleFromOptions: string;
  imagesPath: string;
  specPath: string;
  currentRetryNumber: number;
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
  const stampedImgNew = addPNGMetadata(
    cypressConfig,
    await scaleImageAndWrite({
      scaleFactor: cfg.scaleFactor,
      path: cfg.imgNew,
    }),
  );
  fs.writeFileSync(cfg.imgNew, stampedImgNew);
  const rawImgNewBuffer = Buffer.from(stampedImgNew);
  let imgDiff: number | undefined;
  let imgNewBase64: string, imgOldBase64: string, imgDiffBase64: string;
  let error = false;

  if (fs.existsSync(cfg.imgOld) && cfg.updateImages !== true) {
    const rawImgOldBuffer = fs.readFileSync(cfg.imgOld);
    const [rawImgNew, rawImgOld] = await Promise.all([
      decodePNG(rawImgNewBuffer),
      decodePNG(rawImgOldBuffer),
    ]);
    const isImgSizeDifferent =
      rawImgNew.info.height !== rawImgOld.info.height ||
      rawImgNew.info.width !== rawImgOld.info.width;

    const size = {
      width: Math.max(rawImgNew.info.width, rawImgOld.info.width),
      height: Math.max(rawImgNew.info.height, rawImgOld.info.height),
    };
    const { width, height } = size;

    const [imgNew, imgOld] = isImgSizeDifferent
      ? await Promise.all([
          padImageToSize(rawImgNewBuffer, rawImgNew.info, size),
          padImageToSize(rawImgOldBuffer, rawImgOld.info, size),
        ])
      : [rawImgNew.data, rawImgOld.data];

    const diff = Buffer.alloc(width * height * 4);
    const diffConfig = Object.assign({ includeAA: true }, cfg.diffConfig);

    const diffPixels = pixelmatch(
      asUint8Array(imgNew),
      asUint8Array(imgOld),
      asUint8Array(diff),
      width,
      height,
      diffConfig,
    );
    imgDiff = diffPixels / (width * height);

    if (isImgSizeDifferent) {
      messages.push(
        `Warning: Images size mismatch - new screenshot is ${rawImgNew.info.width}px by ${rawImgNew.info.height}px while old one is ${rawImgOld.info.width}px by ${rawImgOld.info.height} (width x height).`,
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
      error = false;
      messages[0] = messages[0].replace(
        'is bigger than maximum threshold option',
        'was bigger than maximum threshold option (baseline updated):',
      );
    } else if (error) {
      writePNG(
        cypressConfig,
        cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
        diffBuffer,
      );
    } else {
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
