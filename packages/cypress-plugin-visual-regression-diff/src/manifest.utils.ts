import fs from 'fs';
import path from 'path';
import {
  FILE_SUFFIX,
  MANIFEST_VERSION,
  getManifestFileName,
} from './constants';
import type { ImageInfo } from './image.utils';
import { getPluginConfig } from './version.utils';
import type { Manifest, ManifestEntry, ManifestStatus } from './types';

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
  >
>;

export type ManifestRecordInput = {
  imgNew: string;
  imgOld: string;
  specPath?: string;
  testTitlePath?: string[];
  currentRetryNumber?: number;
  browser?: ManifestEntry['browser'];
  viewport?: ManifestEntry['viewport'];
  status: ManifestStatus;
  imgDiff: number;
  maxDiffThreshold: number;
  baselineWritten: boolean;
  imgNewSize?: ImageInfo;
  imgOldSize?: ImageInfo;
  message: string;
};

// keyed by the normalized absolute path of the .actual.png, unique per run
const entries = new Map<string, ManifestEntry>();

const OPTION_KEY = 'pluginVisualRegressionManifestPath';

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

const writeManifest = (config: ManifestConfig, manifestPath: string) => {
  const manifest: Manifest = {
    version: MANIFEST_VERSION,
    runner: {
      name: 'cypress',
      version: config.version,
      testingType: config.testingType,
    },
    projectRoot: config.projectRoot as string,
    entries: [...entries.values()].sort(compareEntries),
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  // write-then-rename so a consumer never reads a half-written file
  const tmpPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmpPath, manifestPath);
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
    browser: input.browser,
    viewport: input.viewport,
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
    browser: existing?.browser,
    viewport: existing?.viewport,
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

/** Forgets every entry and removes a manifest left over from a previous run. */
export const resetManifest = (config: ManifestConfig) => {
  entries.clear();
  const manifestPath = getManifestPath(config);
  if (manifestPath && fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
};

/** Current in-memory entries, sorted the way they are written. Intended for tests. */
export const getManifestEntries = (): ManifestEntry[] =>
  [...entries.values()].sort(compareEntries);
