import path from "path";
import pixelmatch from "pixelmatch";
import fs from "fs";
import { PNG, PNGWithMetadata } from "pngjs";
import { FILE_SUFFIX, IMAGE_SNAPSHOT_PREFIX, TASK } from "./constants";
import moveFile from "move-file";
import sharp from "sharp";
import sanitize from "sanitize-filename";

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

const importAndScaleImage = async (cfg: {
  scaleFactor: number;
  path: string;
}) => {
  const imgBuffer = fs.readFileSync(cfg.path);
  const rawImgNew = PNG.sync.read(imgBuffer);
  if (cfg.scaleFactor === 1) return rawImgNew;

  const newImageWidth = Math.ceil(rawImgNew.width * cfg.scaleFactor);
  const newImageHeight = Math.ceil(rawImgNew.height * cfg.scaleFactor);
  await sharp(imgBuffer).resize(newImageWidth, newImageHeight).toFile(cfg.path);

  return PNG.sync.read(fs.readFileSync(cfg.path));
};

const alignImagesToSameSize = (
  firstImage: PNGWithMetadata,
  secondImage: PNGWithMetadata
) => {
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
  if (config.env["pluginVisualRegressionForceDeviceScaleFactor"] !== false) {
    // based on https://github.com/cypress-io/cypress/issues/2102#issuecomment-521299946
    on("before:browser:launch", (browser, launchOptions) => {
      if (browser.name === "chrome" || browser.name === "chromium") {
        launchOptions.args.push("--force-device-scale-factor=1");
        launchOptions.args.push("--high-dpi-support=1");
      } else if (browser.name === "electron" && browser.isHeaded) {
        // eslint-disable-next-line no-console
        console.log(
          "There isn't currently a way of setting the device scale factor in Cypress when running headed electron so we disable the image regression commands."
        );
      }
    });
  }

  on("task", {
    [TASK.getScreenshotPath]({ title, imagesDir, specPath }) {
      return path.join(
        IMAGE_SNAPSHOT_PREFIX,
        path.dirname(specPath),
        ...imagesDir.split("/"),
        `${sanitize(title)}${FILE_SUFFIX.actual}.png`
      );
    },
    [TASK.doesFileExist]({ path }) {
      return fs.existsSync(path);
    },
    [TASK.approveImage]({ img }) {
      const oldImg = img.replace(FILE_SUFFIX.actual, "");
      if (fs.existsSync(oldImg)) fs.unlinkSync(oldImg);

      const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
      if (fs.existsSync(diffImg)) fs.unlinkSync(diffImg);

      if (fs.existsSync(img)) moveFile.sync(img, oldImg);

      return null;
    },
    async [TASK.compareImages](
      cfg: {
        scaleFactor: number;
        title: string;
        imgNew: string;
        imgOld: string;
        updateImages: boolean;
        maxDiffThreshold: number;
        diffConfig: Parameters<typeof pixelmatch>[5];
      } & Parameters<typeof pixelmatch>[5]
    ) {
      let imgDiff: number | undefined;
      let errorMsg: string | undefined;

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
        imgDiff = (diffPixels / width) * height;

        if (isImgSizeDifferent) {
          errorMsg = `Images size mismatch - new screenshot is ${rawImgNew.width}px by ${rawImgNew.height}px while old one is ${rawImgOld.width}px by ${rawImgOld.height} (width x height).`;
        } else if (imgDiff > cfg.maxDiffThreshold) {
          const roundedImgDiff = Math.ceil(imgDiff * 1000) / 1000;
          errorMsg = `Image diff factor (${roundedImgDiff}) is bigger than maximum threshold option ${cfg.maxDiffThreshold}`;
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
            maxDiffThreshold: cfg.maxDiffThreshold,
          };
        } else {
          // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
          fs.unlinkSync(cfg.imgNew);
        }
      } else {
        // there is no "old screenshot" or screenshots should be immediately updated
        imgDiff = 0;
        moveFile.sync(cfg.imgNew, cfg.imgOld);
      }

      if (typeof imgDiff !== "undefined") {
        const roundedImgDiff = Math.ceil(imgDiff * 1000) / 1000;
        return {
          message: `Image diff (${roundedImgDiff}%) is within boundaries of maximum threshold option ${cfg.maxDiffThreshold}`,
          imgDiff,
          maxDiffThreshold: cfg.maxDiffThreshold,
        };
      }

      return null;
    },
  });

  on("after:screenshot", (details) => {
    if (details.name?.indexOf(IMAGE_SNAPSHOT_PREFIX) !== 0) return;

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

      void moveFile(details.path, newAbsolutePath)
        .then(() => {
          fs.rm(
            path.join(screenshotsFolder, IMAGE_SNAPSHOT_PREFIX),
            { recursive: true, force: true },
            (err) => {
              if (err) return reject(err);

              resolve({ path: newAbsolutePath });
            }
          );
        })
        .catch(reject);
    });
  });
};
