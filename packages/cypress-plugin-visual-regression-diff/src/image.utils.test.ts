import { it, expect, describe } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { file } from 'tmp-promise';
import {
  decodePNG,
  encodePNG,
  padImageToSize,
  scaleImageAndWrite,
} from './image.utils';

const fixturesPath = path.resolve(__dirname, '..', '__tests__', 'fixtures');
const readFixture = (name: string) =>
  fs.readFile(path.join(fixturesPath, name));

// 2x2 image: red, green / blue, white
const rgbPixels = Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
const rgbPNG = () =>
  sharp(rgbPixels, { raw: { width: 2, height: 2, channels: 3 } })
    .png()
    .toBuffer();
const pixelAt = (data: Buffer, width: number, x: number, y: number) => [
  ...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4),
];

describe('decodePNG', () => {
  it('decodes to RGBA even when the PNG has no alpha channel', async () => {
    const { data, info } = await decodePNG(await rgbPNG());

    expect(info).toEqual({ width: 2, height: 2 });
    expect(data).toHaveLength(2 * 2 * 4);
    expect(pixelAt(data, 2, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(data, 2, 1, 1)).toEqual([255, 255, 255, 255]);
  });
});

describe('encodePNG', () => {
  it('round-trips raw RGBA pixels', async () => {
    const { data, info } = await decodePNG(await readFixture('screenshot.png'));

    const decodedAgain = await decodePNG(await encodePNG(data, info));

    expect(decodedAgain.info).toEqual(info);
    expect(decodedAgain.data.equals(data)).toBe(true);
  });
});

describe('padImageToSize', () => {
  it('extends the canvas to the right and bottom with translucent black', async () => {
    const size = { width: 4, height: 3 };

    const data = await padImageToSize(
      await rgbPNG(),
      { width: 2, height: 2 },
      size,
    );

    expect(data).toHaveLength(size.width * size.height * 4);
    // original pixels stay anchored top-left
    expect(pixelAt(data, 4, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(data, 4, 1, 1)).toEqual([255, 255, 255, 255]);
    // padded area
    expect(pixelAt(data, 4, 2, 0)).toEqual([0, 0, 0, 64]);
    expect(pixelAt(data, 4, 0, 2)).toEqual([0, 0, 0, 64]);
    expect(pixelAt(data, 4, 3, 2)).toEqual([0, 0, 0, 64]);
  });
});

describe('scaleImageAndWrite', () => {
  it('returns the file untouched when scaleFactor is 1', async () => {
    const { path: imgPath } = await file();
    const original = await readFixture('screenshot.png');
    await fs.writeFile(imgPath, original);

    const result = await scaleImageAndWrite({ scaleFactor: 1, path: imgPath });

    expect(result.equals(original)).toBe(true);
    expect((await fs.readFile(imgPath)).equals(original)).toBe(true);
  });

  it('scales the image in place and returns the scaled bytes', async () => {
    const { path: imgPath } = await file();
    await fs.writeFile(imgPath, await readFixture('screenshot.png'));

    const result = await scaleImageAndWrite({
      scaleFactor: 0.5,
      path: imgPath,
    });

    const { width, height } = await sharp(result).metadata();
    expect({ width, height }).toEqual({ width: 63, height: 63 });
    expect((await fs.readFile(imgPath)).equals(result)).toBe(true);
  });
});
