import path from "path";
import pixelmatch from "pixelmatch";
import fs from "fs";
import { PNG } from "pngjs";
import { FILE_SUFFIX, IMAGE_SNAPSHOT_PREFIX, TASK } from "./constants";

type NotFalsy<T> = T extends false | null | undefined ? never : T;

const createImageResizer = (width: number, height: number) => (source: PNG) => {
  const resized = new PNG({ width, height, fill: true });
  PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
  return resized;
};

const fillSizeDifference = (width: number, height: number) => (image: PNG) => {
  const inArea = (x: number, y: number) => y > height || x > width;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (inArea(x, y)) {
        const idx = (image.width * y + x) << 2;
        image.data[idx] = 0;
        image.data[idx + 1] = 0;
        image.data[idx + 2] = 0;
        image.data[idx + 3] = 64;
      }
    }
  }
  return image;
};

const alignImagesToSameSize = (firstImage: PNG, secondImage: PNG) => {
  const firstImageWidth = firstImage.width;
  const firstImageHeight = firstImage.height;
  const secondImageWidth = secondImage.width;
  const secondImageHeight = secondImage.height;

  const resizeToSameSize = createImageResizer(
    Math.max(firstImageWidth, secondImageWidth),
    Math.max(firstImageHeight, secondImageHeight)
  );

  const resizedFirst = resizeToSameSize(firstImage);
  const resizedSecond = resizeToSameSize(secondImage);

  return [
    fillSizeDifference(firstImageWidth, firstImageHeight)(resizedFirst),
    fillSizeDifference(secondImageWidth, secondImageHeight)(resizedSecond),
  ];
};

const getConfigVariableOrThrow = <K extends keyof Cypress.PluginConfigOptions>(
  config: Cypress.PluginConfigOptions,
  name: K
) => {
  if (config[name])
    return config[name] as NotFalsy<Cypress.PluginConfigOptions[K]>;

  throw `[Image snapshot] CypressConfig.${name} cannot be missing or \`false\`!`;
};

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) => {
  on("task", {
    [TASK.getScreenshotPath]({ title, specPath }) {
      return path.join(
        IMAGE_SNAPSHOT_PREFIX,
        path.dirname(specPath),
        "__image_snapshots__",
        `${title}${FILE_SUFFIX.actual}.png`
      );
    },
    [TASK.approveImage]({ img }) {
      const oldImg = img.replace(FILE_SUFFIX.actual, "");
      if (fs.existsSync(oldImg)) fs.unlinkSync(oldImg);

      const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
      if (fs.existsSync(diffImg)) fs.unlinkSync(diffImg);

      fs.renameSync(img, oldImg);

      return null;
    },
    [TASK.compareImages](
      cfg: {
        title: string;
        imgNew: string;
        imgOld: string;
      } & Parameters<typeof pixelmatch>[5]
    ) {
      const maxDiffThreshold = 0.01;
      let imgDiff: number | undefined;
      let errorMsg: string | undefined;

      if (fs.existsSync(cfg.imgOld)) {
        const rawImgNew = PNG.sync.read(fs.readFileSync(cfg.imgNew));
        const rawImgOld = PNG.sync.read(fs.readFileSync(cfg.imgOld));
        const isImgSizeDifferent =
          rawImgNew.height !== rawImgOld.height ||
          rawImgNew.width !== rawImgOld.width;

        const [imgNew, imgOld] = isImgSizeDifferent
          ? alignImagesToSameSize(rawImgNew, rawImgOld)
          : [rawImgNew, rawImgOld];

        const { width, height } = imgNew;
        const diff = new PNG({ width, height });
        const diffOptions = Object.assign(
          { threshold: 0.01, includeAA: true },
          cfg
        );

        const diffPixels = pixelmatch(
          imgNew.data,
          imgOld.data,
          diff.data,
          width,
          height,
          diffOptions
        );
        imgDiff = (diffPixels / width) * height;

        if (isImgSizeDifferent) {
          errorMsg = `Images size mismatch - new screenshot is ${rawImgNew.width}px by ${rawImgNew.height}px while old one is ${rawImgOld.width}px by ${rawImgOld.height} (width x height).`;
        } else if (imgDiff > maxDiffThreshold) {
          const roundedImgDiff = Math.ceil(imgDiff * 1000) / 1000;
          errorMsg = `Image diff factor (${roundedImgDiff}) is bigger than maximum threshold option ${maxDiffThreshold}`;
        }

        if (errorMsg) {
          fs.writeFileSync(
            cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
            PNG.sync.write(diff)
          );
          return {
            error: true,
            message: errorMsg,
            imgDiff,
            maxDiffThreshold,
          };
        }

        fs.unlinkSync(cfg.imgOld);
      } else {
        // there is no "old screenshot"
        imgDiff = 0;
      }

      fs.renameSync(cfg.imgNew, cfg.imgOld);

      if (typeof imgDiff !== "undefined") {
        const roundedImgDiff = Math.ceil(imgDiff * 1000) / 1000;
        return {
          message: `Image diff (${roundedImgDiff}%) is within boundaries of maximum threshold option ${maxDiffThreshold}`,
          imgDiff,
          maxDiffThreshold,
        };
      }

      return null;
    },
  });

  on("after:screenshot", (details) => {
    if (details.name.indexOf(IMAGE_SNAPSHOT_PREFIX) !== 0) return;

    return new Promise((resolve, reject) => {
      const screenshotsFolder = getConfigVariableOrThrow(
        config,
        "screenshotsFolder"
      );

      const newRelativePath = details.name.substring(
        IMAGE_SNAPSHOT_PREFIX.length + path.sep.length
      );
      const newAbsolutePath = path.normalize(
        path.join(config.projectRoot, newRelativePath)
      );

      fs.rename(details.path, newAbsolutePath, (err) => {
        if (err) return reject(err);

        fs.rm(
          path.join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX),
          { recursive: true, force: true },
          (err) => {
            if (err) return reject(err);

            resolve({ path: newAbsolutePath });
          }
        );
      });
    });
  });
};
