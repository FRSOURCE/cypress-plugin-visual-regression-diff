import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import type {
  Manifest,
  ManifestEntry,
  ManifestStatus,
} from '@frsource/cypress-plugin-visual-regression-diff/plugins';

export const STATUSES = [
  'passed',
  'failed',
  'missing-baseline',
  'created',
  'updated',
  'approved',
] as const satisfies readonly ManifestStatus[];

/** Entries a human has to look at. */
export const NEEDS_HUMAN: readonly ManifestStatus[] = [
  'failed',
  'missing-baseline',
];

const imageSchema = z.looseObject({
  path: z.string().nullable(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const entrySchema = z.looseObject({
  name: z.string(),
  test: z.looseObject({
    file: z.string(),
    titlePath: z.array(z.string()),
    retry: z.number(),
  }),
  status: z.enum(STATUSES),
  comparison: z.looseObject({ diffRatio: z.number(), threshold: z.number() }),
  images: z.looseObject({
    baseline: imageSchema.extend({ path: z.string() }),
    actual: imageSchema,
    diff: z.looseObject({ path: z.string().nullable() }),
  }),
  baselineWritten: z.boolean(),
  message: z.string().default(''),
});

// everything beyond what the app needs is passed through untouched
const manifestSchema = z.looseObject({
  version: z.literal(1),
  projectRoot: z.string(),
  ci: z.looseObject({}).nullable().optional(),
  runner: z.looseObject({ name: z.string() }).optional(),
  entries: z.array(entrySchema),
});

export class ManifestParseError extends Error {
  constructor(
    public readonly where: string,
    detail: string,
  ) {
    super(`Invalid manifest ${where}: ${detail}`);
    this.name = 'ManifestParseError';
  }
}

export const parseManifest = (json: unknown, where: string): Manifest => {
  const result = manifestSchema.safeParse(json);
  if (!result.success) {
    throw new ManifestParseError(
      where,
      result.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; '),
    );
  }
  return result.data as unknown as Manifest;
};

export type ManifestSource = {
  artifactId: number;
  artifactName: string;
  /** Path of the manifest inside the artifact zip. */
  zipPath: string;
  manifest: Manifest;
};

export type RepoPaths = {
  baseline: string | null;
  actual: string | null;
  diff: string | null;
};

export type MergedEntry = {
  key: string;
  keyHash: string;
  entry: ManifestEntry;
  source: ManifestSource;
  runAttempt: number;
  /** Repository-relative POSIX paths, `null` when unknown or unsafe. */
  repoPaths: RepoPaths;
  /** Set when this entry can never be approved from CI (bad path, no `.actual.png`). */
  unapprovableReason?: string;
  /** Other entries (key hashes) that write the same baseline path. */
  collidesWith: string[];
};

export type MergedRun = {
  entries: MergedEntry[];
  sources: ManifestSource[];
  warnings: string[];
  counts: Record<ManifestStatus, number>;
  needsHuman: MergedEntry[];
};

export const entryKey = (entry: ManifestEntry) =>
  [
    entry.name,
    entry.test.file,
    entry.platform?.os ?? '',
    entry.platform?.browser?.name ?? '',
  ].join('\u0000');

export const keyHash = (key: string) =>
  createHash('sha1').update(key).digest('hex').slice(0, 12);

export const platformLabel = (entry: ManifestEntry) => {
  const os = entry.platform?.os;
  const browser = entry.platform?.browser?.name;
  return [os, browser].filter(Boolean).join(' / ') || '';
};

const toPosix = (p: string) => p.replace(/\\/g, '/');

/** POSIX, relative, no `..`, `.` or empty segments, no drive letters, backslashes or NUL. */
export const isSafeRelativePath = (p: string) => {
  if (!p || p.includes('\u0000') || p.includes('\\')) return false;
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return false;
  return p.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');
};

/**
 * Directory of the Cypress project inside the repository (`''` for the root),
 * derived from `ci.workspace` when the manifest has it, else the config hint.
 * `null` when the project root lies outside the workspace.
 */
export const projectDirInRepo = (
  manifest: Manifest,
  hint = '',
): string | null => {
  const workspace = manifest.ci?.workspace;
  if (!workspace) return toPosix(hint).replace(/^\.?\/+|\/+$/g, '');
  const rel = path.posix.relative(
    toPosix(workspace).replace(/\/+$/, ''),
    toPosix(manifest.projectRoot).replace(/\/+$/, ''),
  );
  if (rel === '') return '';
  if (rel.startsWith('..') || path.posix.isAbsolute(rel)) return null;
  return rel;
};

/** Turns a project-relative manifest path into a repository-relative one, or `null` when it escapes the repository. */
export const toRepoPath = (
  projectDir: string | null,
  p: string | null,
): string | null => {
  if (p === null || projectDir === null) return null;
  const joined = path.posix.normalize(projectDir ? `${projectDir}/${p}` : p);
  return isSafeRelativePath(joined) ? joined : null;
};

const emptyCounts = (): Record<ManifestStatus, number> =>
  Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    ManifestStatus,
    number
  >;

const compareEntries = (a: MergedEntry, b: MergedEntry) =>
  a.entry.test.file.localeCompare(b.entry.test.file) ||
  a.entry.name.localeCompare(b.entry.name) ||
  platformLabel(a.entry).localeCompare(platformLabel(b.entry));

export type MergeOptions = {
  headSha?: string;
  runId?: number;
  repository?: string;
  projectRootHint?: string;
};

/**
 * Concatenates the entries of every manifest found in a run (several machines,
 * e2e + component, re-run attempts) into one list keyed by screenshot name,
 * test file and platform. A later attempt wins over an earlier one.
 */
export const mergeManifests = (
  sources: ManifestSource[],
  opts: MergeOptions = {},
): MergedRun => {
  const warnings: string[] = [];
  const byKey = new Map<string, MergedEntry>();

  for (const source of sources) {
    const { manifest } = source;
    const where = `${source.artifactName}:${source.zipPath}`;
    const ci = manifest.ci;
    if (ci) {
      if (
        opts.headSha &&
        ci.pullRequest?.headSha &&
        ci.pullRequest.headSha !== opts.headSha
      ) {
        warnings.push(
          `${where}: manifest was written for commit ${ci.pullRequest.headSha.slice(0, 7)}, the run is for ${opts.headSha.slice(0, 7)}`,
        );
      }
      if (opts.runId && ci.runId && String(ci.runId) !== String(opts.runId)) {
        warnings.push(
          `${where}: manifest belongs to run ${ci.runId}, not ${opts.runId}`,
        );
      }
      if (
        opts.repository &&
        ci.repository &&
        ci.repository !== opts.repository
      ) {
        warnings.push(
          `${where}: manifest belongs to ${ci.repository}, not ${opts.repository}`,
        );
      }
    }
    const projectDir = projectDirInRepo(manifest, opts.projectRootHint);
    if (projectDir === null) {
      warnings.push(
        `${where}: project root ${manifest.projectRoot} is outside the checkout ${manifest.ci?.workspace}; its screenshots cannot be approved from CI`,
      );
    }
    const runAttempt = Number.parseInt(String(ci?.runAttempt ?? '1'), 10) || 1;

    for (const entry of manifest.entries) {
      const key = entryKey(entry);
      const repoPaths: RepoPaths = {
        baseline: toRepoPath(projectDir, entry.images.baseline.path),
        actual: toRepoPath(projectDir, entry.images.actual.path),
        diff: toRepoPath(projectDir, entry.images.diff.path),
      };
      let unapprovableReason: string | undefined;
      if (NEEDS_HUMAN.includes(entry.status)) {
        if (!repoPaths.baseline) {
          unapprovableReason = `baseline path \`${entry.images.baseline.path}\` is outside the repository`;
        } else if (!entry.images.actual.path) {
          unapprovableReason = 'the run kept no `.actual.png` for it';
        } else if (!repoPaths.actual) {
          unapprovableReason = `actual path \`${entry.images.actual.path}\` is outside the repository`;
        }
      }
      const merged: MergedEntry = {
        key,
        keyHash: keyHash(key),
        entry,
        source,
        runAttempt,
        repoPaths,
        unapprovableReason,
        collidesWith: [],
      };
      const existing = byKey.get(key);
      // later attempts win; within one attempt the later artifact wins
      if (!existing || existing.runAttempt <= runAttempt)
        byKey.set(key, merged);
    }
  }

  const entries = [...byKey.values()].sort(compareEntries);
  const counts = emptyCounts();
  for (const { entry } of entries) counts[entry.status] += 1;
  const needsHuman = entries.filter((e) =>
    NEEDS_HUMAN.includes(e.entry.status),
  );

  // two platforms writing the same baseline file cannot both be approved
  const byBaseline = new Map<string, MergedEntry[]>();
  for (const e of needsHuman) {
    if (!e.repoPaths.baseline) continue;
    const list = byBaseline.get(e.repoPaths.baseline) ?? [];
    list.push(e);
    byBaseline.set(e.repoPaths.baseline, list);
  }
  for (const list of byBaseline.values()) {
    if (list.length < 2) continue;
    for (const e of list) {
      e.collidesWith = list.filter((o) => o !== e).map((o) => o.keyHash);
    }
  }

  return { entries, sources, warnings, counts, needsHuman };
};

/** Entries chosen by name (`/approve-visuals a b`) or by key hash (check-run button). */
export const selectEntries = (
  run: MergedRun,
  selection: 'all' | { keyHashes: string[] } | { names: string[] },
): { entries: MergedEntry[]; unknown: string[] } => {
  if (selection === 'all') return { entries: run.needsHuman, unknown: [] };
  if ('keyHashes' in selection) {
    const wanted = new Set(selection.keyHashes);
    const entries = run.entries.filter((e) => wanted.has(e.keyHash));
    const found = new Set(entries.map((e) => e.keyHash));
    return {
      entries,
      unknown: selection.keyHashes.filter((h) => !found.has(h)),
    };
  }
  const entries: MergedEntry[] = [];
  const unknown: string[] = [];
  for (const name of selection.names) {
    const matches = run.entries.filter(
      (e) =>
        e.entry.name === name ||
        `${e.entry.name} (${platformLabel(e.entry)})` === name,
    );
    if (matches.length === 0) unknown.push(name);
    entries.push(...matches);
  }
  return { entries: [...new Set(entries)], unknown };
};
