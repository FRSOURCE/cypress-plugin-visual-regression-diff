import path from "path";
import {
  FILE_SUFFIX,
  IMAGE_SNAPSHOT_PREFIX,
  PATH_VARIABLES,
  WINDOWS_LIKE_DRIVE_REGEX,
} from "./constants";
import sanitize from "sanitize-filename";

const nameCacheCounter: Record<string, number> = {};

export const generateScreenshotPath = ({
  titleFromOptions,
  imagesPath,
  specPath,
  currentRetryNumber,
}: {
  titleFromOptions: string;
  imagesPath: string;
  specPath: string;
  currentRetryNumber: number;
}) => {
  const parsePathPartVariables = (pathPart: string, i: number) => {
    if (pathPart === PATH_VARIABLES.specPath) {
      return path.dirname(specPath);
    } else if (i === 0 && !pathPart) {
      // when unix-like absolute path
      return PATH_VARIABLES.unixSystemRootPath;
    } else if (i === 0 && WINDOWS_LIKE_DRIVE_REGEX.test(pathPart)) {
      // when win-like absolute path
      return path.join(PATH_VARIABLES.winSystemRootPath, pathPart[0]);
    }

    return pathPart;
  };

  const screenshotPath = path.join(
    ...imagesPath.split("/").map(parsePathPartVariables),
    sanitize(titleFromOptions)
  );

  if (typeof nameCacheCounter[screenshotPath] === "undefined") {
    nameCacheCounter[screenshotPath] = -1;
  }

  // it's a retry of the same image, so let's decrease the counter
  if (currentRetryNumber > 0) {
    --nameCacheCounter[screenshotPath];
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

export const resetScreenshotNameCache = () => {
  Object.keys(nameCacheCounter).forEach((k) => delete nameCacheCounter[k]);
};
