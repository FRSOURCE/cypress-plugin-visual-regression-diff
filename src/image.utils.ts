import path from "path";
import fs from "fs";
import { PNG, PNGWithMetadata } from "pngjs";
import sharp from "sharp";
import metaPngPkg from 'meta-png';
const { addMetadata, getMetadata } = metaPngPkg;
import glob from "glob";
import { version } from "../package.json";
import { wasScreenshotUsed } from "./screenshotPath.utils";
import { METADATA_KEY } from "./constants";

export const addPNGMetadata = (png: Buffer) =>
  addMetadata(png, METADATA_KEY, version /* c8 ignore next */);
export const getPNGMetadata = (png: Buffer) =>
  getMetadata(png, METADATA_KEY /* c8 ignore next */);
export const isImageCurrentVersion = (png: Buffer) =>
  getPNGMetadata(png) === version;
export const isImageGeneratedByPlugin = (png: Buffer) =>
  !!getPNGMetadata(png /* c8 ignore next */);

export const writePNG = (name: string, png: PNG | Buffer) =>
  fs.writeFileSync(
    name,
    addPNGMetadata(png instanceof PNG ? PNG.sync.write(png) : png)
  );

const inArea = (x: number, y: number, height: number, width: number) =>
  y > height || x > width;

export const fillSizeDifference = (
  image: PNG,
  width: number,
  height: number
) => {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (inArea(x, y, height, width)) {
        const idx = (image.width * y + x) << 2;
        image.data[idx] = 0;
        image.data[idx + 1] = 0;
        image.data[idx + 2] = 0;
        image.data[idx + 3] = 64;
      }
    }
  }
  return image;
  /* c8 ignore next */
};

export const createImageResizer =
  (width: number, height: number) => (source: PNG) => {
    const resized = new PNG({ width, height, fill: true });
    PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
    return resized;
    /* c8 ignore next */
  };

export const scaleImageAndWrite = async ({
  scaleFactor,
  path,
}: {
  scaleFactor: number;
  path: string;
}) => {
  const imgBuffer = fs.readFileSync(path);
  if (scaleFactor === 1) return imgBuffer;

  const rawImgNew = PNG.sync.read(imgBuffer);
  const newImageWidth = Math.ceil(rawImgNew.width * scaleFactor);
  const newImageHeight = Math.ceil(rawImgNew.height * scaleFactor);
  await sharp(imgBuffer).resize(newImageWidth, newImageHeight).toFile(path);

  return fs.readFileSync(path);
};

export const alignImagesToSameSize = (
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
    fillSizeDifference(resizedFirst, firstImageWidth, firstImageHeight),
    fillSizeDifference(resizedSecond, secondImageWidth, secondImageHeight),
  ];
};

export const cleanupUnused = (rootPath: string) => {
  glob
    .sync("**/*.png", {
      cwd: rootPath,
      ignore: "node_modules/**/*",
    })
    .forEach((pngPath) => {
      const absolutePath = path.join(rootPath, pngPath);
      if (
        !wasScreenshotUsed(pngPath) &&
        isImageGeneratedByPlugin(fs.readFileSync(absolutePath))
      ) {
        fs.unlinkSync(absolutePath);
      }
    });
};
