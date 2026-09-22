import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import picomatch from 'picomatch';
import type { ProbotOctokit } from 'probot';
import * as yauzl from 'yauzl';

export type ArtifactRef = {
  id: number;
  name: string;
  sizeInBytes: number;
  expired: boolean;
  expiresAt: string | null;
};

export class ArtifactTooLargeError extends Error {
  constructor(
    public readonly limit: number,
    public readonly actual?: number,
  ) {
    super(
      `Artifact exceeds the ${limit} byte limit${actual ? ` (${actual} bytes)` : ''}`,
    );
    this.name = 'ArtifactTooLargeError';
  }
}

export const listMatchingArtifacts = async (
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  runId: number,
  nameGlobs: string[],
): Promise<ArtifactRef[]> => {
  const all = await octokit.paginate(
    octokit.rest.actions.listWorkflowRunArtifacts,
    { owner, repo, run_id: runId, per_page: 100 },
  );
  const isMatch = picomatch(nameGlobs, { dot: true });
  return all
    .filter((artifact) => isMatch(artifact.name))
    .map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      sizeInBytes: artifact.size_in_bytes,
      expired: artifact.expired,
      expiresAt: artifact.expires_at ?? null,
    }));
};

export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
}>;

/**
 * Streams an artifact zip to disk. GitHub answers the download endpoint with
 * a redirect to a pre-signed URL; following it manually keeps the zip out of
 * memory and lets the size cap kick in before anything is written.
 */
export const downloadArtifactZip = async (
  octokit: ProbotOctokit,
  {
    owner,
    repo,
    artifactId,
  }: { owner: string; repo: string; artifactId: number },
  destZip: string,
  { maxBytes, fetchImpl = fetch }: { maxBytes: number; fetchImpl?: FetchLike },
): Promise<number> => {
  const response = await octokit.rest.actions.downloadArtifact({
    owner,
    repo,
    artifact_id: artifactId,
    archive_format: 'zip',
    request: { redirect: 'manual', parseSuccessResponseBody: false },
  });
  const location = (response.headers as Record<string, string | undefined>)
    .location;
  if (!location) {
    throw new Error(
      `Artifact ${artifactId}: expected a redirect, got HTTP ${response.status}`,
    );
  }
  const download = await fetchImpl(location);
  if (!download.ok || !download.body) {
    throw new Error(
      `Artifact ${artifactId}: download failed with HTTP ${download.status}`,
    );
  }
  const announced = Number(download.headers.get('content-length'));
  if (Number.isFinite(announced) && announced > maxBytes) {
    throw new ArtifactTooLargeError(maxBytes, announced);
  }

  let bytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxBytes) callback(new ArtifactTooLargeError(maxBytes));
      else callback(null, chunk);
    },
  });
  await mkdir(path.dirname(destZip), { recursive: true });
  await pipeline(
    Readable.fromWeb(download.body as import('node:stream/web').ReadableStream),
    counter,
    createWriteStream(destZip),
  );
  return bytes;
};

export type ExtractedFile = { size: number; path: string };
/** Zip entry path (POSIX) → extracted file. */
export type ExtractedFiles = Map<string, ExtractedFile>;

const insideDir = (dir: string, target: string) => {
  const rel = path.relative(dir, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
};

/**
 * Extracts the wanted entries of a zip into `destDir`, streaming one file at
 * a time. Entries with unsafe names (absolute, `..`, backslashes) are skipped.
 */
export const extractZip = async (
  zipPath: string,
  destDir: string,
  {
    keep,
    maxFileBytes,
  }: { keep: (zipEntryPath: string) => boolean; maxFileBytes: number },
): Promise<ExtractedFiles> => {
  const zipfile = await yauzl.openPromise(zipPath, {
    lazyEntries: true,
    autoClose: true,
  });
  const files: ExtractedFiles = new Map();

  await new Promise<void>((resolve, reject) => {
    zipfile.on('error', reject);
    zipfile.on('end', resolve);
    zipfile.on('entry', (entry: yauzl.Entry) => {
      void (async () => {
        try {
          const name = entry.fileName;
          const target = path.join(destDir, ...name.split('/'));
          const wanted =
            !name.endsWith('/') &&
            yauzl.validateFileName(name) === null &&
            insideDir(destDir, target) &&
            keep(name) &&
            entry.uncompressedSize <= maxFileBytes;
          if (wanted) {
            await mkdir(path.dirname(target), { recursive: true });
            const stream = await zipfile.openReadStreamPromise(entry);
            await pipeline(stream, createWriteStream(target));
            files.set(name, { size: entry.uncompressedSize, path: target });
          }
          zipfile.readEntry();
        } catch (error) {
          reject(error);
        }
      })();
    });
    zipfile.readEntry();
  });

  return files;
};

/**
 * Finds the zip entry holding a project-relative manifest path.
 * `actions/upload-artifact` strips the common ancestor of its `path` globs, and
 * a monorepo may upload from the repository root, so the zip path can be a
 * shorter or a longer variant of the manifest path. The candidate sharing the
 * longest segment-aligned suffix wins; a tie means the path is ambiguous.
 */
export const findEntryFile = (
  zipPaths: Iterable<string>,
  projectRelativePath: string,
): string | null => {
  const wanted = projectRelativePath.replace(/^\.?\/+/, '');
  let best: { zipPath: string; score: number } | null = null;
  let tie = false;
  for (const zipPath of zipPaths) {
    let score: number;
    if (zipPath === wanted) score = Number.MAX_SAFE_INTEGER;
    else if (zipPath.endsWith(`/${wanted}`)) score = wanted.length;
    else if (wanted.endsWith(`/${zipPath}`)) score = zipPath.length;
    else continue;
    if (!best || score > best.score) {
      best = { zipPath, score };
      tie = false;
    } else if (score === best.score) {
      tie = true;
    }
  }
  return best && !tie ? best.zipPath : null;
};

export const findManifestFiles = (
  zipPaths: Iterable<string>,
  manifestGlob: string,
): string[] => {
  const isMatch = picomatch(manifestGlob, { dot: true });
  return [...zipPaths].filter((p) => isMatch(p)).sort();
};

/** What we keep from an artifact: the PNGs and the JSON manifests. */
export const keepImagesAndManifests = (zipEntryPath: string) =>
  /\.(png|json)$/i.test(zipEntryPath);
