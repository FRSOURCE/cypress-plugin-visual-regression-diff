export type CompareImagesTaskReturn = null | {
  error?: boolean;
  message?: string;
  imgDiff?: number;
  imgNewBase64?: string;
  imgDiffBase64?: string;
  imgOldBase64?: string;
  maxDiffThreshold?: number;
};

export type PendingDiffRecord = {
  title: string;
  imgPath: string;
  imgOldPath: string;
  imgNewBase64: string;
  imgOldBase64: string;
  imgDiffBase64: string;
  message: string;
};
