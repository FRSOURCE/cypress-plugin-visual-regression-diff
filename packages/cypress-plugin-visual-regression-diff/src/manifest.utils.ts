import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  FILE_SUFFIX,
  MANIFEST_VERSION,
  getManifestFileName,
} from './constants';
import { detectCi, type EnvLike } from './ci.utils';
import type { ImageInfo } from './image.utils';
import { getPluginConfig, supportsExpose } from './version.utils';
import type {
  Manifest,
  ManifestBrowser,
  ManifestCi,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestPlatform,
  ManifestRunner,
  ManifestStatus,
} from './types';

/** The subset of the Cypress plugin config the manifest needs; everything is optional so unit tests can pass `{}`. */
export type ManifestConfig = Partial<
  Pick<
    Cypress.PluginConfigOptions,
    | 'projectRoot'
    | 'screenshotsFolder'
    | 'testingType'
    | 'version'
    | 'expose'
    | 'env'
    | 'platform'
    | 'arch'
    | 'configFile'
    | 'isTextTerminal'
    | 'isInteractive'
    | 'baseUrl'
    | 'specPattern'
    | 'viewportWidth'
    | 'viewportHeight'
    | 'retries'
  >
>;

/** What `before:run` hands over; typed loosely so unit tests can pass a subset. */
export type ManifestRunDetails = Partial<
  Pick<
    Cypress.BeforeRunDetails,
    | 'browser'
    | 'specs'
    | 'specPattern'
    | 'system'
    | 'runUrl'
    | 'group'
    | 'tag'
    | 'parallel'
    | 'cypressVersion'
  >
>;

export type ManifestBrowserInput = Pick<Cypress.Browser, 'name' | 'version'> &
  Partial<Pick<Cypress.Browser, 'family' | 'isHeadless'>>;

export type ManifestRecordInput = {
  imgNew: string;
  imgOld: string;
  specPath?: string;
  testTitlePath?: string[];
  currentRetryNumber?: number;
  platform?: ManifestEntry['platform'];
  viewport?: ManifestEntry['viewport'];
  options?: ManifestEntryOptions;
  status: ManifestStatus;
  imgDiff: number;
  maxDiffThreshold: number;
  baselineWritten: boolean;
  imgNewSize?: ImageInfo;
  imgOldSize?: ImageInfo;
  message: string;
};

type RunInfo = {
  createdAt: string;
  platform: ManifestPlatform;
  ci: ManifestCi | null;
  options: Record<string, unknown>;
  runner: ManifestRunner;
};

// keyed by the normalized absolute path of the .actual.png, unique per run
const entries = new Map<string, ManifestEntry>();
let run: RunInfo | null = null;

const OPTION_KEY = 'pluginVisualRegressionManifestPath';
const OPTION_PREFIX = 'pluginVisualRegression';

const now = () => new Date().toISOString();

/**
 * Resolves where the manifest is written, or `null` when it is disabled
 * (`pluginVisualRegressionManifestPath: false`) or the config is incomplete.
 */
export const getManifestPath = (config: ManifestConfig): string | null => {
  if (!config.projectRoot) return null;
  const option = getPluginConfig(
    config as Cypress.PluginConfigOptions,
    OPTION_KEY,
  );
  if (option === false || option === 'false') return null;
  if (typeof option === 'string' && option) {
    return path.resolve(config.projectRoot, option);
  }
  const dir =
    config.screenshotsFolder ||
    path.join(config.projectRoot, 'cypress', 'screenshots');
  return path.join(dir, getManifestFileName(config.testingType));
};

export const toPosix = (p: string, sep: string = path.sep) =>
  sep === '/' ? p : p.split(sep).join('/');

const toKey = (projectRoot: string, p: string) =>
  path.normalize(path.resolve(projectRoot, p));

const toProjectRelative = (projectRoot: string, absolute: string) =>
  toPosix(path.relative(projectRoot, absolute));

const nameFromActualPath = (actualPath: string) => {
  const stem = path.basename(actualPath, path.extname(actualPath));
  return stem.endsWith(FILE_SUFFIX.actual)
    ? stem.slice(0, -FILE_SUFFIX.actual.length)
    : stem;
};

const existingPathOrNull = (projectRoot: string, absolute: string) =>
  fs.existsSync(absolute) ? toProjectRelative(projectRoot, absolute) : null;

// the `.diff.png` sibling, or null when the name has no `.actual` suffix
const existingDiffPathOrNull = (projectRoot: string, actualPath: string) => {
  const diffPath = actualPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  return diffPath === actualPath
    ? null
    : existingPathOrNull(projectRoot, diffPath);
};

const sameTitlePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((part, i) => part === b[i]);

const compareEntries = (a: ManifestEntry, b: ManifestEntry) =>
  a.test.file.localeCompare(b.test.file) || a.name.localeCompare(b.name);

/**
 * Global plugin options as configured, with the `pluginVisualRegression`
 * prefix stripped (`pluginVisualRegressionUpdateImages` -> `updateImages`).
 * Values are kept verbatim, so CLI-provided ones stay strings.
 */
export const getPluginOptions = (
  config: ManifestConfig,
): Record<string, unknown> => {
  const source =
    (supportsExpose(config.version ?? '') ? config.expose : config.env) ?? {};
  const options: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith(OPTION_PREFIX) && key.length > OPTION_PREFIX.length) {
      const rest = key.slice(OPTION_PREFIX.length);
      options[rest.charAt(0).toLowerCase() + rest.slice(1)] = value;
    }
  }
  return options;
};

const toManifestBrowser = (browser: ManifestBrowserInput): ManifestBrowser => ({
  name: browser.name,
  version: browser.version,
  ...(browser.family !== undefined && { family: browser.family }),
  ...(browser.isHeadless !== undefined && { headless: browser.isHeadless }),
});

const projectRelativeOrUndefined = (
  projectRoot: string | undefined,
  p: string | undefined,
) =>
  p && projectRoot
    ? toProjectRelative(projectRoot, path.resolve(p))
    : undefined;

/**
 * Seeds the run-level manifest data from the Cypress config, the process and
 * the environment. `details` (from `before:run`) adds what is only known in
 * run mode: the spec list, the OS version, Cypress Cloud fields.
 */
export const initManifestRun = (
  config: ManifestConfig,
  details?: ManifestRunDetails,
  env: EnvLike = process.env,
): RunInfo => {
  const mode: ManifestRunner['mode'] =
    config.isTextTerminal === true ||
    (config.isTextTerminal === undefined && config.isInteractive === false)
      ? 'run'
      : 'open';
  const runner: ManifestRunner = {
    name: 'cypress',
    version: details?.cypressVersion ?? config.version,
    testingType: config.testingType,
    mode,
    configFile: projectRelativeOrUndefined(
      config.projectRoot,
      config.configFile,
    ),
    browser: details?.browser ? toManifestBrowser(details.browser) : undefined,
    specs: details?.specs?.map((spec) => toPosix(spec.relative)),
    specPattern: details?.specPattern ?? config.specPattern,
    baseUrl: config.baseUrl,
    viewport:
      config.viewportWidth && config.viewportHeight
        ? { width: config.viewportWidth, height: config.viewportHeight }
        : undefined,
    retries: config.retries,
    cloud: details?.runUrl
      ? {
          runUrl: details.runUrl,
          group: details.group,
          tag: details.tag,
          parallel: details.parallel,
        }
      : undefined,
  };
  run = {
    createdAt: now(),
    platform: {
      os: config.platform ?? process.platform,
      arch: config.arch ?? process.arch,
      osVersion: details?.system?.osVersion ?? os.release(),
    },
    ci: detectCi(env),
    options: getPluginOptions(config),
    runner,
  };
  return run;
};

const ensureRun = (config: ManifestConfig) => run ?? initManifestRun(config);

const writeManifest = (config: ManifestConfig, manifestPath: string) => {
  const info = ensureRun(config);
  const manifest: Manifest = {
    version: MANIFEST_VERSION,
    createdAt: info.createdAt,
    updatedAt: now(),
    projectRoot: config.projectRoot as string,
    platform: info.platform,
    ci: info.ci,
    options: info.options,
    runner: info.runner,
    entries: [...entries.values()].sort(compareEntries),
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  // write-then-rename so a consumer never reads a half-written file
  const tmpPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmpPath, manifestPath);
};

/**
 * Records the browser Cypress launched (`before:browser:launch`, fires in
 * both `run` and `open` mode). The file is only rewritten when it exists
 * already, i.e. when something was recorded.
 */
export const setManifestBrowser = (
  config: ManifestConfig,
  browser: ManifestBrowserInput,
) => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return;
  ensureRun(config).runner.browser = toManifestBrowser(browser);
  if (entries.size > 0) writeManifest(config, manifestPath);
};

/** Records the outcome of one comparison and rewrites the manifest file. */
export const recordManifestEntry = (
  config: ManifestConfig,
  input: ManifestRecordInput,
): ManifestEntry | null => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return null;
  const projectRoot = config.projectRoot as string;

  const actualAbs = toKey(projectRoot, input.imgNew);
  const baselineAbs = toKey(projectRoot, input.imgOld);
  const test = {
    file: toPosix(input.specPath ?? ''),
    titlePath: input.testTitlePath ?? [],
    retry: input.currentRetryNumber ?? 0,
  };

  // a retried test regenerates its screenshot paths from scratch, so entries
  // left by an earlier attempt of the same test are stale
  if (test.retry > 0) {
    for (const [key, entry] of entries) {
      if (
        entry.test.retry < test.retry &&
        entry.test.file === test.file &&
        sameTitlePath(entry.test.titlePath, test.titlePath)
      ) {
        entries.delete(key);
      }
    }
  }

  const entry: ManifestEntry = {
    name: nameFromActualPath(actualAbs),
    test,
    status: input.status,
    comparison: {
      diffRatio: input.imgDiff,
      threshold: input.maxDiffThreshold,
    },
    images: {
      baseline: {
        path: toProjectRelative(projectRoot, baselineAbs),
        ...input.imgOldSize,
      },
      actual: {
        path: existingPathOrNull(projectRoot, actualAbs),
        ...input.imgNewSize,
      },
      diff: { path: existingDiffPathOrNull(projectRoot, actualAbs) },
    },
    baselineWritten: input.baselineWritten,
    recordedAt: now(),
    platform: input.platform,
    viewport: input.viewport,
    options: input.options,
    message: input.message,
  };
  entries.set(actualAbs, entry);
  writeManifest(config, manifestPath);
  return entry;
};

/** Marks a screenshot as approved (baseline replaced by the `.actual.png`) after a headed review. */
export const markManifestEntryApproved = (
  config: ManifestConfig,
  {
    img,
    imgOld,
    specPath,
  }: { img: string; imgOld?: string; specPath?: string },
): ManifestEntry | null => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return null;
  const projectRoot = config.projectRoot as string;

  const actualAbs = toKey(projectRoot, img);
  const baselineAbs = toKey(
    projectRoot,
    imgOld ?? img.replace(FILE_SUFFIX.actual, ''),
  );
  const existing = entries.get(actualAbs);
  const entry: ManifestEntry = {
    name: existing?.name ?? nameFromActualPath(actualAbs),
    test: existing?.test ?? {
      file: toPosix(specPath ?? ''),
      titlePath: [],
      retry: 0,
    },
    status: 'approved',
    comparison: existing?.comparison ?? { diffRatio: 0, threshold: 0 },
    images: {
      baseline: {
        ...existing?.images.baseline,
        path: toProjectRelative(projectRoot, baselineAbs),
      },
      actual: { ...existing?.images.actual, path: null },
      diff: { path: null },
    },
    baselineWritten: true,
    recordedAt: now(),
    platform: existing?.platform,
    viewport: existing?.viewport,
    options: existing?.options,
    message: 'Baseline image was replaced with the approved screenshot.',
  };
  entries.set(actualAbs, entry);
  writeManifest(config, manifestPath);
  return entry;
};

/**
 * Drops the entries of one test file. Called when a spec starts, so that a
 * re-run in `cypress open` (which restarts the screenshot counters) does not
 * leave stale entries behind.
 */
export const dropSpecEntries = (config: ManifestConfig, specPath: string) => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return;
  const file = toPosix(specPath);
  let changed = false;
  for (const [key, entry] of entries) {
    if (entry.test.file === file) {
      entries.delete(key);
      changed = true;
    }
  }
  if (changed) writeManifest(config, manifestPath);
};

/**
 * Forgets every entry, removes a manifest left over from a previous run and
 * re-seeds the run-level data (with the `before:run` details when given).
 */
export const resetManifest = (
  config: ManifestConfig,
  details?: ManifestRunDetails,
  env?: EnvLike,
) => {
  entries.clear();
  initManifestRun(config, details, env);
  const manifestPath = getManifestPath(config);
  if (manifestPath && fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
};

/** Current in-memory entries, sorted the way they are written. Intended for tests. */
export const getManifestEntries = (): ManifestEntry[] =>
  [...entries.values()].sort(compareEntries);
