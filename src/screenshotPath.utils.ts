import path from "path";
import { FILE_SUFFIX, IMAGE_SNAPSHOT_PREFIX } from "./constants";
import sanitize from "sanitize-filename";

const nameCacheCounter: Record<string, number> = {};

export const generateScreenshotPath = ({
  titleFromOptions,
  imagesDir,
  specPath,
}: {
  titleFromOptions: string;
  imagesDir: string;
  specPath: string;
}) => {
  const screenshotPath = path.join(
    path.dirname(specPath),
    ...imagesDir.split("/"),
    sanitize(titleFromOptions)
  );

  if (typeof nameCacheCounter[screenshotPath] === "undefined") {
    nameCacheCounter[screenshotPath] = -1;
  }
  return path.join(
    IMAGE_SNAPSHOT_PREFIX,
    `${screenshotPath} #${++nameCacheCounter[screenshotPath]}${
      FILE_SUFFIX.actual
    }.png`
  );
};

const screenshotPathRegex = new RegExp(
  `^([\\s\\S]+?) #([0-9]+)(?:(?:\\${FILE_SUFFIX.diff})|(?:\\${FILE_SUFFIX.actual}))?\\.(?:png|PNG)$`
);
export const wasScreenshotUsed = (imagePath: string) => {
  const matched = imagePath.match(screenshotPathRegex);
  /* c8 ignore next */ if (!matched) return false;
  const [, screenshotPath, numString] = matched;
  const num = parseInt(numString);
  /* c8 ignore next */ if (!screenshotPath || isNaN(num)) return false;
  return (
    screenshotPath in nameCacheCounter &&
    num <= nameCacheCounter[screenshotPath]
  );
};
