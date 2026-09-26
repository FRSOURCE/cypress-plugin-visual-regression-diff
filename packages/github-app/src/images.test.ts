import { mkdir, utimes, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import nock from 'nock';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  cacheDirFor,
  createImageHandler,
  healthHandler,
  imageUrl,
  PLACEHOLDER_PNG,
  signImageToken,
  sweepCache,
  verifyImageToken,
} from './images.js';
import { must, png, tmpDir } from './test-utils.js';

const ref = { i: 1, o: 'o', r: 'r', run: 555, a: 9, p: 'shots/a.png' };

// the handler tests below talk to a local http server
beforeAll(() => nock.enableNetConnect(/127\.0\.0\.1/));

describe('image tokens', () => {
  it('round-trips and expires', () => {
    const now = 1_700_000_000_000;
    const token = signImageToken(ref, 60, 's', now);
    expect(verifyImageToken(token, 's', now)).toEqual({
      ...ref,
      e: now / 1000 + 60,
    });
    expect(verifyImageToken(token, 's', now + 61_000)).toBeNull();
    expect(imageUrl('https://x.test', token)).toBe(
      `https://x.test/img/${token}`,
    );
  });

  it('rejects tampering and garbage', () => {
    const token = signImageToken(ref, 60, 's');
    const [payload, sig] = token.split('.') as [string, string];
    expect(verifyImageToken(token, 'other')).toBeNull();
    expect(verifyImageToken(`${payload}x.${sig}`, 's')).toBeNull();
    expect(verifyImageToken(`${payload}.${sig}.extra`, 's')).toBeNull();
    expect(verifyImageToken('nope', 's')).toBeNull();
    const forged = Buffer.from('"string"').toString('base64url');
    expect(verifyImageToken(`${forged}.${sig}`, 's')).toBeNull();
  });
});

describe('cacheDirFor', () => {
  it('nests by installation, repo, run and artifact with escaped segments', () => {
    expect(cacheDirFor('/c', { ...ref, o: 'we/ird' })).toBe(
      path.join('/c', '1', 'we%2Fird', 'r', '555', '9'),
    );
  });
});

describe('sweepCache', () => {
  it('removes expired and oversized artifact dirs, oldest first', async () => {
    const root = await tmpDir();
    const mk = async (a: number, ageMs: number, size: number) => {
      const dir = cacheDirFor(root, { ...ref, a });
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'f.png'), Buffer.alloc(size));
      const t = (Date.now() - ageMs) / 1000;
      await utimes(dir, t, t);
      return dir;
    };
    await mk(1, 10 * 3600_000, 10);
    await mk(2, 1000, 100);
    await mk(3, 2000, 100);
    const { removed } = await sweepCache(root, {
      ttlMs: 3600_000,
      maxBytes: 150,
    });
    // artifact 1 expired, then the oldest remaining (3) goes to get under 150 bytes
    expect(removed).toBe(2);
    expect(await sweepCache(root, { ttlMs: 3600_000, maxBytes: 150 })).toEqual({
      removed: 0,
    });
    expect(
      await sweepCache('/does/not/exist', { ttlMs: 1, maxBytes: 1 }),
    ).toEqual({ removed: 0 });
  });
});

describe('image handler', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  const start = async (
    resolve: Parameters<typeof createImageHandler>[0]['resolve'],
  ) => {
    const handler = createImageHandler({ secret: 's', resolve });
    server = createServer((req, res) => {
      void (async () => {
        if (await healthHandler(req, res)) return;
        if (await handler(req, res)) return;
        res.writeHead(404).end();
      })();
    });
    await new Promise<void>((done) => must(server).listen(0, done));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  };

  it('serves cached files, placeholders and errors', async () => {
    const dir = await tmpDir();
    const file = path.join(dir, 'a.png');
    await writeFile(file, png('cached'));
    const base = await start(async (r) => {
      if (r.p === 'shots/a.png') return { file };
      if (r.p === 'gone.png') return { expired: true };
      return null;
    });
    const token = signImageToken(ref, 60, 's');

    const ok = await fetch(`${base}/img/${token}`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('image/png');
    expect(ok.headers.get('x-robots-tag')).toBe('noindex');
    expect(Buffer.from(await ok.arrayBuffer())).toEqual(png('cached'));

    const head = await fetch(`${base}/img/${token}`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(
      String(png('cached').length),
    );

    const gone = await fetch(
      `${base}/img/${signImageToken({ ...ref, p: 'gone.png' }, 60, 's')}`,
    );
    expect(gone.status).toBe(410);
    expect(Buffer.from(await gone.arrayBuffer())).toEqual(PLACEHOLDER_PNG);

    expect(
      (
        await fetch(
          `${base}/img/${signImageToken({ ...ref, p: 'x' }, 60, 's')}`,
        )
      ).status,
    ).toBe(404);
    expect((await fetch(`${base}/img/${token}x`)).status).toBe(401);
    expect(
      (await fetch(`${base}/img/${token}`, { method: 'POST' })).status,
    ).toBe(405);
    expect((await fetch(`${base}/other`)).status).toBe(404);

    const health = await fetch(`${base}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.text()).toBe('ok');
  });
});
