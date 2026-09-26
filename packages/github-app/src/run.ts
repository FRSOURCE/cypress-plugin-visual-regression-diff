import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProbotOctokit } from 'probot';
import {
  downloadArtifactZip,
  extractZip,
  findEntryFile,
  findManifestFiles,
  keepImagesAndManifests,
  listMatchingArtifacts,
  type ArtifactRef,
  type ExtractedFiles,
  type FetchLike,
} from './artifacts.js';
import type { Config } from './config.js';
import type { Env } from './env.js';
import {
  cacheDirFor,
  imageUrl,
  signImageToken,
  type ImageRef,
} from './images.js';
import {
  mergeManifests,
  parseManifestJson,
  sourceLabel,
  type ManifestSource,
  type MergedEntry,
  type MergedRun,
} from './manifest.js';
import type { ImageUrls } from './report.js';

export type RunLocator = {
  installationId: number;
  owner: string;
  repo: string;
  runId: number;
  attempt: number;
  headSha: string;
};

type CachedArtifact = {
  artifact: ArtifactRef;
  dir: string;
  files: ExtractedFiles;
};

export type LoadedRun = {
  kind: 'loaded';
  run: MergedRun;
  artifacts: CachedArtifact[];
  expiredArtifacts: ArtifactRef[];
  warnings: string[];
};

export type EmptyRun = {
  kind: 'no-artifacts' | 'no-manifest';
  expiredArtifacts: ArtifactRef[];
  warnings: string[];
};

export type LoadRunDeps = { fetchImpl?: FetchLike };

const INDEX_FILE = '.index.json';

const relativeFiles = (dir: string, files: ExtractedFiles) =>
  Object.fromEntries(
    [...files].map(([zipPath, f]) => [
      zipPath,
      { size: f.size, path: path.relative(dir, f.path) },
    ]),
  );

const absoluteFiles = (
  dir: string,
  index: Record<string, { size: number; path: string }>,
): ExtractedFiles =>
  new Map(
    Object.entries(index).map(([zipPath, f]) => [
      zipPath,
      { size: f.size, path: path.join(dir, f.path) },
    ]),
  );

/**
 * Makes an artifact's PNGs and manifests available on disk, downloading and
 * extracting it once; later calls (image requests, approvals) hit the cache.
 */
export const ensureArtifact = async (
  octokit: ProbotOctokit,
  loc: Pick<RunLocator, 'installationId' | 'owner' | 'repo' | 'runId'>,
  artifact: Pick<ArtifactRef, 'id'>,
  env: Env,
  deps: LoadRunDeps = {},
): Promise<ExtractedFiles> => {
  const dir = cacheDirFor(env.cacheDir, {
    i: loc.installationId,
    o: loc.owner,
    r: loc.repo,
    run: loc.runId,
    a: artifact.id,
  });
  try {
    const index = JSON.parse(
      await readFile(path.join(dir, INDEX_FILE), 'utf8'),
    ) as Record<string, { size: number; path: string }>;
    return absoluteFiles(dir, index);
  } catch {
    // not cached yet
  }
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const zipPath = `${dir}.zip`;
  try {
    await downloadArtifactZip(
      octokit,
      { owner: loc.owner, repo: loc.repo, artifactId: artifact.id },
      zipPath,
      { maxBytes: env.maxArtifactBytes, fetchImpl: deps.fetchImpl },
    );
    const files = await extractZip(zipPath, dir, {
      keep: keepImagesAndManifests,
      maxFileBytes: env.maxFileBytes,
    });
    await writeFile(
      path.join(dir, INDEX_FILE),
      JSON.stringify(relativeFiles(dir, files)),
    );
    return files;
  } finally {
    await rm(zipPath, { force: true });
  }
};

/** Lists, downloads and merges every manifest of a workflow run. */
export const loadRun = async (
  octokit: ProbotOctokit,
  loc: RunLocator,
  config: Config,
  env: Env,
  deps: LoadRunDeps = {},
): Promise<LoadedRun | EmptyRun> => {
  const warnings: string[] = [];
  const all = await listMatchingArtifacts(
    octokit,
    loc.owner,
    loc.repo,
    loc.runId,
    config.artifacts,
  );
  const expiredArtifacts = all.filter((a) => a.expired);
  const live = all.filter((a) => !a.expired);
  if (live.length === 0) {
    return { kind: 'no-artifacts', expiredArtifacts, warnings };
  }

  const artifacts: CachedArtifact[] = [];
  let budget = env.maxArtifactBytes;
  for (const artifact of live) {
    if (artifact.sizeInBytes > budget) {
      warnings.push(
        `Artifact \`${artifact.name}\` (${artifact.sizeInBytes} bytes) was skipped: over the download budget.`,
      );
      continue;
    }
    budget -= artifact.sizeInBytes;
    const files = await ensureArtifact(octokit, loc, artifact, env, deps);
    artifacts.push({
      artifact,
      dir: cacheDirFor(env.cacheDir, {
        i: loc.installationId,
        o: loc.owner,
        r: loc.repo,
        run: loc.runId,
        a: artifact.id,
      }),
      files,
    });
  }

  const sources: ManifestSource[] = [];
  for (const cached of artifacts) {
    for (const zipPath of findManifestFiles(
      cached.files.keys(),
      config.manifestGlob,
    )) {
      const file = cached.files.get(zipPath);
      if (!file) continue;
      const where = { artifactName: cached.artifact.name, zipPath };
      try {
        sources.push({
          artifactId: cached.artifact.id,
          ...where,
          label: sourceLabel(where),
          manifest: parseManifestJson(
            await readFile(file.path, 'utf8'),
            sourceLabel(where),
          ),
        });
      } catch (error) {
        warnings.push(
          `\`${sourceLabel(where)}\` could not be read: ${(error as Error).message}`,
        );
      }
    }
  }
  if (sources.length === 0) {
    return { kind: 'no-manifest', expiredArtifacts, warnings };
  }

  const run = mergeManifests(sources, {
    headSha: loc.headSha,
    runId: loc.runId,
    repository: `${loc.owner}/${loc.repo}`,
    projectRootHint: config.projectRoot,
  });
  run.warnings.unshift(...warnings);
  return { kind: 'loaded', run, artifacts, expiredArtifacts, warnings };
};

type ImageKind = 'baseline' | 'actual' | 'diff';

/** Locates one of an entry's images inside the run's artifacts; the manifest's own artifact is searched first. */
export const locateImage = (
  loaded: LoadedRun,
  entry: MergedEntry,
  kind: ImageKind,
): { artifactId: number; zipPath: string; file: string } | null => {
  const projectPath = entry.entry.images[kind].path;
  if (!projectPath) return null;
  const ordered = [
    ...loaded.artifacts.filter(
      (a) => a.artifact.id === entry.source.artifactId,
    ),
    ...loaded.artifacts.filter(
      (a) => a.artifact.id !== entry.source.artifactId,
    ),
  ];
  for (const cached of ordered) {
    const zipPath = findEntryFile(cached.files.keys(), projectPath);
    const file = zipPath ? cached.files.get(zipPath) : undefined;
    if (zipPath && file) {
      return { artifactId: cached.artifact.id, zipPath, file: file.path };
    }
  }
  return null;
};

export const readActualImage = async (
  loaded: LoadedRun,
  entry: MergedEntry,
): Promise<Buffer | null> => {
  const located = locateImage(loaded, entry, 'actual');
  return located ? readFile(located.file) : null;
};

/** Builds the `images(entry)` function the report needs. */
export const imageUrlsFor =
  (
    loaded: LoadedRun,
    loc: RunLocator,
    config: Config,
    env: Env,
    now = Date.now(),
  ) =>
  (entry: MergedEntry): ImageUrls | null => {
    if (!config.images) return null;
    const ttlSeconds =
      Math.min(config.imageTtlDays * 24, env.imageUrlTtlHours) * 3600;
    const urls: ImageUrls = {};
    for (const kind of ['baseline', 'actual', 'diff'] as const) {
      const located = locateImage(loaded, entry, kind);
      if (!located) continue;
      const ref: Omit<ImageRef, 'e'> = {
        i: loc.installationId,
        o: loc.owner,
        r: loc.repo,
        run: loc.runId,
        a: located.artifactId,
        p: located.zipPath,
      };
      urls[kind] = imageUrl(
        env.publicUrl,
        signImageToken(ref, ttlSeconds, env.imageUrlSecret, now),
      );
    }
    return Object.keys(urls).length ? urls : null;
  };

/**
 * Resolves an image link to a file: from the cache, re-downloading the
 * artifact when the cache was swept, `expired` once GitHub dropped it.
 */
export const resolveImage = async (
  octokit: ProbotOctokit,
  ref: ImageRef,
  env: Env,
  deps: LoadRunDeps = {},
): Promise<{ file: string } | { expired: true } | null> => {
  const loc = {
    installationId: ref.i,
    owner: ref.o,
    repo: ref.r,
    runId: ref.run,
  };
  const fromFiles = (files: ExtractedFiles) => {
    const file = files.get(ref.p);
    return file ? { file: file.path } : null;
  };
  try {
    return fromFiles(
      await ensureArtifact(octokit, loc, { id: ref.a }, env, deps),
    );
  } catch (error) {
    const status = (error as { status?: number }).status;
    // 410 Gone: expired artifact; 404: deleted
    if (status === 410 || status === 404) return { expired: true };
    throw error;
  }
};
