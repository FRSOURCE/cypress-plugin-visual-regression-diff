import fs from "fs";
import { PNG, PNGWithMetadata } from "pngjs";
import sharp from "sharp";

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

export const importAndScaleImage = async (cfg: {
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
