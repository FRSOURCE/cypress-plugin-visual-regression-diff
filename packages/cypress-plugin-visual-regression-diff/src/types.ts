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
 *
 * Per-entry data is self-sufficient for approving a screenshot (paths) and for
 * telling entries of different machines apart (`platform`, `viewport`) once the
 * `entries` arrays of several manifests get concatenated. Run-level data
 * locates the run (`ci`) and describes how to reproduce it (`runner`,
 * `platform`, `options`).
 */
export type ManifestStatus =
  'passed' | 'failed' | 'missing-baseline' | 'created' | 'updated' | 'approved';

export type ManifestImage = {
  /** Path relative to `Manifest.projectRoot` with `/` separators; `null` when the file no longer exists. */
  path: string | null;
  width?: number;
  height?: number;
};

export type ManifestBrowser = {
  name: string;
  version: string;
  family?: string;
  headless?: boolean;
};

/** Where the run happened. `os` uses Node's `process.platform` names (`linux`, `darwin`, `win32`). */
export type ManifestPlatform = {
  os: string;
  arch: string;
  osVersion?: string;
};

/**
 * The `matchImage` options a comparison was made with, exactly as configured
 * (`imagesPath` keeps its `{spec_path}`-style tokens unexpanded). Plugin
 * vocabulary, not runner vocabulary - a Playwright client writes the same keys.
 */
export type ManifestEntryOptions = {
  imagesPath: string;
  title?: string;
  maxDiffThreshold: number;
  diffConfig: Record<string, unknown>;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  forceDeviceScaleFactor: boolean;
  matchAgainstPath?: string;
  /** Only JSON-serialisable keys; callbacks are dropped. */
  screenshotConfig: Record<string, unknown>;
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
  /** ISO 8601 timestamp of when the entry was (last) written. */
  recordedAt: string;
  /** Where this particular screenshot was taken; kept per entry because manifests of several machines get merged. */
  platform?: { os: string; arch?: string; browser: ManifestBrowser };
  viewport?: { width: number; height: number };
  /** Absent on entries created by the review UI without a preceding comparison. */
  options?: ManifestEntryOptions;
  /** Human-readable summary, informational only. */
  message: string;
};

/**
 * CI metadata detected from environment variables. `null` outside CI;
 * `provider: null` when only a generic `CI` flag is set.
 *
 * On GitHub `pull_request` events `sha` is the synthetic merge commit; tools
 * that write to the PR branch must use `pullRequest.headSha` / `headRef`.
 */
export type ManifestCi = {
  provider: 'github' | 'gitlab' | null;
  /** `owner/repo` (GitHub) or `group/project` (GitLab). */
  repository?: string;
  sha?: string;
  ref?: string;
  /** Source branch when known. */
  branch?: string;
  pullRequest?: {
    number: number;
    headSha?: string;
    headRef?: string;
    baseRef?: string;
  } | null;
  event?: string;
  runId?: string;
  runAttempt?: string;
  runNumber?: string;
  job?: string;
  jobId?: string;
  workflow?: string;
  serverUrl?: string;
  /** Link to the run/job page. */
  url?: string;
  /** Absolute path of the checked-out repository on the CI machine. */
  workspace?: string;
};

export type ManifestRunner = {
  name: string;
  version?: string;
  /** Cypress: `e2e` or `component`. */
  testingType?: string;
  /** `run` for a headless CLI run, `open` for the interactive app. */
  mode?: 'run' | 'open';
  /** Config file path relative to `Manifest.projectRoot` with `/` separators. */
  configFile?: string;
  browser?: ManifestBrowser;
  /** Spec files of the run relative to `Manifest.projectRoot`; only known in `run` mode. */
  specs?: string[];
  specPattern?: string | string[];
  baseUrl?: string | null;
  viewport?: { width: number; height: number };
  retries?: unknown;
  /** Cypress Cloud details, when recording. */
  cloud?: {
    runUrl?: string;
    group?: string;
    tag?: string;
    parallel?: boolean;
  };
  [runnerSpecific: string]: unknown;
};

export type Manifest = {
  version: 1;
  /** ISO 8601, when the run started (manifest was reset). */
  createdAt: string;
  /** ISO 8601, when the file was last written. */
  updatedAt: string;
  /** Absolute path all relative paths in the manifest resolve against. */
  projectRoot: string;
  platform: ManifestPlatform;
  ci: ManifestCi | null;
  /** Global plugin options as configured (`pluginVisualRegression` prefix stripped, values verbatim). */
  options: Record<string, unknown>;
  runner: ManifestRunner;
  entries: ManifestEntry[];
};
