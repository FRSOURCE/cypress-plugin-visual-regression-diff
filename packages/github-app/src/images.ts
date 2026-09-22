import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

/** What an image link points at: one file inside one artifact of one run. */
export type ImageRef = {
  /** installation id */
  i: number;
  /** owner */
  o: string;
  /** repo */
  r: string;
  /** workflow run id */
  run: number;
  /** artifact id */
  a: number;
  /** zip entry path */
  p: string;
  /** expiry, unix seconds */
  e: number;
};

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64url');

const sign = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 32);

export const signImageToken = (
  ref: Omit<ImageRef, 'e'>,
  ttlSeconds: number,
  secret: string,
  now = Date.now(),
): string => {
  const full: ImageRef = { ...ref, e: Math.floor(now / 1000) + ttlSeconds };
  const payload = base64url(JSON.stringify(full));
  return `${payload}.${sign(payload, secret)}`;
};

const isImageRef = (value: unknown): value is ImageRef =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ImageRef).i === 'number' &&
  typeof (value as ImageRef).o === 'string' &&
  typeof (value as ImageRef).r === 'string' &&
  typeof (value as ImageRef).run === 'number' &&
  typeof (value as ImageRef).a === 'number' &&
  typeof (value as ImageRef).p === 'string' &&
  typeof (value as ImageRef).e === 'number';

/** `null` for a tampered, malformed or expired token. */
export const verifyImageToken = (
  token: string,
  secret: string,
  now = Date.now(),
): ImageRef | null => {
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;
  const expected = sign(payload, secret);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }
  try {
    const ref: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    if (!isImageRef(ref) || ref.e * 1000 <= now) return null;
    return ref;
  } catch {
    return null;
  }
};

export const imageUrl = (publicUrl: string, token: string) =>
  `${publicUrl}/img/${token}`;

const segment = (value: string | number) => encodeURIComponent(String(value));

/** `<root>/<installation>/<owner>/<repo>/<run>/<artifact>` */
export const cacheDirFor = (
  root: string,
  ref: Pick<ImageRef, 'i' | 'o' | 'r' | 'run' | 'a'>,
) =>
  path.join(
    root,
    segment(ref.i),
    segment(ref.o),
    segment(ref.r),
    segment(ref.run),
    segment(ref.a),
  );

const ARTIFACT_DEPTH = 5;

const listArtifactDirs = async (
  dir: string,
  depth: number,
): Promise<string[]> => {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const dirs: string[] = [];
  for (const name of names) {
    const full = path.join(dir, name);
    let info;
    try {
      info = await stat(full);
    } catch {
      continue;
    }
    if (!info.isDirectory()) continue;
    if (depth === 1) dirs.push(full);
    else dirs.push(...(await listArtifactDirs(full, depth - 1)));
  }
  return dirs;
};

const dirSize = async (dir: string): Promise<number> => {
  let total = 0;
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) total += await dirSize(full);
    else total += (await stat(full)).size;
  }
  return total;
};

/**
 * Removes artifact directories older than `ttlMs` and, if the cache is still
 * above `maxBytes`, the oldest remaining ones until it fits.
 */
export const sweepCache = async (
  root: string,
  {
    ttlMs,
    maxBytes,
    now = Date.now(),
  }: { ttlMs: number; maxBytes: number; now?: number },
): Promise<{ removed: number }> => {
  const dirs = await listArtifactDirs(root, ARTIFACT_DEPTH);
  const info = await Promise.all(
    dirs.map(async (dir) => ({
      dir,
      mtimeMs: (await stat(dir)).mtimeMs,
      size: await dirSize(dir),
    })),
  );
  info.sort((a, b) => a.mtimeMs - b.mtimeMs);
  let total = info.reduce((sum, d) => sum + d.size, 0);
  let removed = 0;
  for (const d of info) {
    const expired = now - d.mtimeMs > ttlMs;
    if (!expired && total <= maxBytes) continue;
    await rm(d.dir, { recursive: true, force: true });
    total -= d.size;
    removed += 1;
  }
  return { removed };
};

/** 1x1 transparent PNG shown when the artifact behind a link has expired. */
export const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export type ImageResolver = (
  ref: ImageRef,
) => Promise<{ file: string } | { expired: true } | null>;

export type ImageHandlerDeps = {
  secret: string;
  resolve: ImageResolver;
  now?: () => number;
};

const IMG_ROUTE = /^\/img\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\/?$/;

/**
 * Serves `GET /img/<token>`: the cached PNG for a valid, unexpired token.
 * Returns `false` for other URLs so Probot's own routes keep working.
 */
export const createImageHandler =
  ({ secret, resolve, now = Date.now }: ImageHandlerDeps) =>
  async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = req.url?.split('?')[0] ?? '';
    const match = url.match(IMG_ROUTE);
    if (!match) return false;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' }).end();
      return true;
    }
    const ref = verifyImageToken(match[1] as string, secret, now());
    if (!ref) {
      res
        .writeHead(401, { 'content-type': 'text/plain' })
        .end('invalid or expired image link');
      return true;
    }
    const headers = {
      'cache-control': 'private, max-age=86400',
      'x-robots-tag': 'noindex',
      'content-type': 'image/png',
    };
    const resolved = await resolve(ref);
    if (!resolved) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return true;
    }
    if ('expired' in resolved) {
      res.writeHead(410, headers).end(PLACEHOLDER_PNG);
      return true;
    }
    const info = await stat(resolved.file);
    res.writeHead(200, { ...headers, 'content-length': info.size });
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    await new Promise<void>((done, fail) => {
      createReadStream(resolved.file)
        .on('error', fail)
        .on('end', done)
        .pipe(res);
    });
    return true;
  };

/** `GET /healthz` */
export const healthHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> => {
  if ((req.url?.split('?')[0] ?? '') !== '/healthz') return false;
  res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
  return true;
};
