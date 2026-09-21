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
  passed?: boolean;
  deferred?: boolean;
};

/**
 * Run manifest: a machine-readable record of every comparison made during a run,
 * meant for CI consumers (GitHub Action, review services). The shape is
 * runner-agnostic - everything Cypress-specific lives in `Manifest.runner`.
 */
export type ManifestStatus =
  'passed' | 'failed' | 'missing-baseline' | 'created' | 'updated' | 'approved';

export type ManifestImage = {
  /** Path relative to `Manifest.projectRoot` with `/` separators; `null` when the file no longer exists. */
  path: string | null;
  width?: number;
  height?: number;
};

export type ManifestEntry = {
  /** Screenshot name, equal to the baseline file stem. Unique within a run. */
  name: string;
  test: {
    /** Test file path relative to `Manifest.projectRoot` with `/` separators. */
    file: string;
    titlePath: string[];
    retry: number;
  };
  status: ManifestStatus;
  comparison: {
    /** Share of differing pixels, 0..1. `0` when no comparison ran. */
    diffRatio: number;
    threshold: number;
  };
  images: {
    baseline: ManifestImage & { path: string };
    actual: ManifestImage;
    diff: Pick<ManifestImage, 'path'>;
  };
  /** `true` whenever the baseline file was (re)written during this run. */
  baselineWritten: boolean;
  browser?: { name: string; version: string };
  viewport?: { width: number; height: number };
  /** Human-readable summary, informational only. */
  message: string;
};

export type ManifestRunner = {
  name: string;
  version?: string;
  [runnerSpecific: string]: unknown;
};

export type Manifest = {
  version: 1;
  runner: ManifestRunner;
  /** Absolute path all relative paths in the manifest resolve against. */
  projectRoot: string;
  entries: ManifestEntry[];
};
