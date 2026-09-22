import { readFile } from 'node:fs/promises';
import nock from 'nock';
import { ProbotOctokit } from 'probot';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { verifyImageToken } from './images.js';
import {
  imageUrlsFor,
  loadRun,
  locateImage,
  readActualImage,
  resolveImage,
} from './run.js';
import {
  API,
  artifactListing,
  entry,
  failingArtifactZip,
  fetchZip,
  HEAD_SHA,
  manifest,
  MANIFEST_ZIP_PATH,
  mockArtifact,
  png,
  testEnv,
  must,
  zipOf,
} from './test-utils.js';

const octokit = new ProbotOctokit({
  auth: { token: 'x' },
  retry: { enabled: false },
});
const loc = {
  installationId: 1,
  owner: 'o',
  repo: 'r',
  runId: 555,
  attempt: 1,
  headSha: HEAD_SHA,
};

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

describe('loadRun', () => {
  it('downloads once, then serves the cache', async () => {
    const env = await testEnv();
    const zip = failingArtifactZip();
    const scope = mockArtifact(nock(API));

    const first = await loadRun(octokit, loc, DEFAULT_CONFIG, env, {
      fetchImpl: fetchZip(zip),
    });
    expect(first.kind).toBe('loaded');
    if (first.kind !== 'loaded') return;
    expect(first.run.needsHuman.map((e) => e.entry.name)).toEqual(['home_#0']);
    expect(
      locateImage(first, must(first.run.entries[0]), 'diff')?.zipPath,
    ).toBe('cypress/e2e/__image_snapshots__/home_#0.diff.png');
    expect(await readActualImage(first, must(first.run.entries[0]))).toEqual(
      png('actual'),
    );
    expect(scope.isDone()).toBe(true);

    // only the listing is requested the second time
    nock(API)
      .get('/repos/o/r/actions/runs/555/artifacts')
      .query(true)
      .reply(200, artifactListing());
    const second = await loadRun(octokit, loc, DEFAULT_CONFIG, env, {
      fetchImpl: () => Promise.reject(new Error('must not download again')),
    });
    expect(second.kind).toBe('loaded');
  });

  it('reports missing artifacts, missing manifests and unreadable manifests', async () => {
    const env = await testEnv();
    nock(API)
      .get('/repos/o/r/actions/runs/555/artifacts')
      .query(true)
      .reply(200, artifactListing({ expired: true }));
    expect(await loadRun(octokit, loc, DEFAULT_CONFIG, env)).toMatchObject({
      kind: 'no-artifacts',
      expiredArtifacts: [{ id: 9 }],
    });

    mockArtifact(nock(API));
    expect(
      await loadRun(octokit, loc, DEFAULT_CONFIG, env, {
        fetchImpl: fetchZip(zipOf({ 'a.png': png('a') })),
      }),
    ).toMatchObject({ kind: 'no-manifest' });

    const env2 = await testEnv();
    mockArtifact(nock(API));
    expect(
      await loadRun(octokit, loc, DEFAULT_CONFIG, env2, {
        fetchImpl: fetchZip(zipOf({ [MANIFEST_ZIP_PATH]: 'not json' })),
      }),
    ).toMatchObject({
      kind: 'no-manifest',
      warnings: [expect.stringContaining('could not be read')],
    });
  });

  it('skips artifacts over the download budget', async () => {
    const env = await testEnv({ MAX_ARTIFACT_BYTES: '10' });
    nock(API)
      .get('/repos/o/r/actions/runs/555/artifacts')
      .query(true)
      .reply(200, artifactListing());
    const result = await loadRun(octokit, loc, DEFAULT_CONFIG, env);
    expect(result).toMatchObject({
      kind: 'no-manifest',
      warnings: [expect.stringContaining('over the download budget')],
    });
  });
});

describe('imageUrlsFor', () => {
  it('signs one link per available image and honours images: false', async () => {
    const env = await testEnv({ IMAGE_URL_TTL_HOURS: '1' });
    mockArtifact(nock(API));
    const loaded = await loadRun(octokit, loc, DEFAULT_CONFIG, env, {
      fetchImpl: fetchZip(
        zipOf({
          [MANIFEST_ZIP_PATH]: JSON.stringify(manifest([entry()])),
          'cypress/e2e/__image_snapshots__/home_#0.actual.png': png('actual'),
        }),
      ),
    });
    if (loaded.kind !== 'loaded') throw new Error('expected a loaded run');
    const now = 1_700_000_000_000;
    const urls = imageUrlsFor(
      loaded,
      loc,
      DEFAULT_CONFIG,
      env,
      now,
    )(must(loaded.run.entries[0]));
    expect(Object.keys(urls ?? {})).toEqual(['actual']);
    const token = must(must(urls).actual).replace(
      'https://vr.example.test/img/',
      '',
    );
    expect(verifyImageToken(token, env.imageUrlSecret, now)).toMatchObject({
      i: 1,
      o: 'o',
      r: 'r',
      run: 555,
      a: 9,
      p: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      e: now / 1000 + 3600, // capped by the server, not the 14 days from the config
    });
    expect(
      imageUrlsFor(
        loaded,
        loc,
        { ...DEFAULT_CONFIG, images: false },
        env,
      )(must(loaded.run.entries[0])),
    ).toBeNull();
  });
});

describe('resolveImage', () => {
  it('re-downloads a swept artifact and reports expired ones', async () => {
    const env = await testEnv();
    const ref = {
      i: 1,
      o: 'o',
      r: 'r',
      run: 555,
      a: 9,
      p: 'cypress/e2e/__image_snapshots__/home_#0.png',
      e: 0,
    };
    nock(API)
      .get('/repos/o/r/actions/artifacts/9/zip')
      .reply(302, '', { location: 'https://blob.example.test/9.zip' });
    const resolved = await resolveImage(octokit, ref, env, {
      fetchImpl: fetchZip(failingArtifactZip()),
    });
    expect(resolved && 'file' in resolved).toBe(true);
    if (resolved && 'file' in resolved)
      expect(await readFile(resolved.file)).toEqual(png('baseline'));
    expect(
      await resolveImage(octokit, { ...ref, p: 'nope.png' }, env),
    ).toBeNull();

    nock(API)
      .get('/repos/o/r/actions/artifacts/10/zip')
      .reply(410, { message: 'Gone' });
    expect(await resolveImage(octokit, { ...ref, a: 10 }, env)).toEqual({
      expired: true,
    });

    nock(API)
      .get('/repos/o/r/actions/artifacts/11/zip')
      .reply(500, { message: 'boom' });
    await expect(
      resolveImage(octokit, { ...ref, a: 11 }, env),
    ).rejects.toThrow();
  });
});
