import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nock from 'nock';
import { ProbotOctokit } from 'probot';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  ArtifactTooLargeError,
  downloadArtifactZip,
  extractZip,
  findEntryFile,
  findManifestFiles,
  keepImagesAndManifests,
  listMatchingArtifacts,
} from './artifacts.js';
import {
  API,
  artifactListing,
  fetchZip,
  png,
  tmpDir,
  must,
  zipOf,
} from './test-utils.js';

const octokit = new ProbotOctokit({
  auth: { token: 'x' },
  retry: { enabled: false },
});

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

describe('listMatchingArtifacts', () => {
  it('paginates and filters by name globs', async () => {
    nock(API)
      .get('/repos/o/r/actions/runs/555/artifacts')
      .query({ per_page: '100' })
      .reply(
        200,
        {
          total_count: 3,
          artifacts: [
            ...artifactListing().artifacts,
            {
              id: 10,
              name: 'coverage',
              size_in_bytes: 1,
              expired: false,
              expires_at: null,
            },
          ],
        },
        {
          link: `<${API}/repos/o/r/actions/runs/555/artifacts?per_page=100&page=2>; rel="next"`,
        },
      )
      .get('/repos/o/r/actions/runs/555/artifacts')
      .query({ per_page: '100', page: '2' })
      .reply(200, {
        total_count: 3,
        artifacts: [
          {
            id: 11,
            name: 'test-2',
            size_in_bytes: 5,
            expired: true,
            expires_at: null,
          },
        ],
      });

    expect(
      await listMatchingArtifacts(octokit, 'o', 'r', 555, ['test*']),
    ).toEqual([
      {
        id: 9,
        name: 'test',
        sizeInBytes: 1234,
        expired: false,
        expiresAt: '2027-01-01T00:00:00Z',
      },
      {
        id: 11,
        name: 'test-2',
        sizeInBytes: 5,
        expired: true,
        expiresAt: null,
      },
    ]);
  });
});

describe('downloadArtifactZip', () => {
  it('follows the redirect manually and streams to disk', async () => {
    nock(API)
      .get('/repos/o/r/actions/artifacts/9/zip')
      .reply(302, '', { location: 'https://blob.example.test/9.zip' });
    const zip = zipOf({ 'a.txt': 'hi' });
    const dest = path.join(await tmpDir(), 'nested', '9.zip');

    const bytes = await downloadArtifactZip(
      octokit,
      { owner: 'o', repo: 'r', artifactId: 9 },
      dest,
      { maxBytes: 10_000, fetchImpl: fetchZip(zip) },
    );
    expect(bytes).toBe(zip.length);
    expect(await readFile(dest)).toEqual(zip);
  });

  it('refuses oversized downloads before and while streaming', async () => {
    nock(API)
      .get('/repos/o/r/actions/artifacts/9/zip')
      .times(2)
      .reply(302, '', { location: 'https://blob.example.test/9.zip' });
    const zip = zipOf({ 'a.txt': 'x'.repeat(500) });
    const dir = await tmpDir();

    await expect(
      downloadArtifactZip(
        octokit,
        { owner: 'o', repo: 'r', artifactId: 9 },
        path.join(dir, 'a.zip'),
        {
          maxBytes: 10,
          fetchImpl: fetchZip(zip),
        },
      ),
    ).rejects.toBeInstanceOf(ArtifactTooLargeError);
    await expect(
      downloadArtifactZip(
        octokit,
        { owner: 'o', repo: 'r', artifactId: 9 },
        path.join(dir, 'b.zip'),
        {
          maxBytes: 10,
          fetchImpl: fetchZip(zip, { contentLength: false }),
        },
      ),
    ).rejects.toBeInstanceOf(ArtifactTooLargeError);
  });

  it('fails clearly without a redirect or on a failed download', async () => {
    nock(API).get('/repos/o/r/actions/artifacts/9/zip').reply(200, '');
    const dir = await tmpDir();
    await expect(
      downloadArtifactZip(
        octokit,
        { owner: 'o', repo: 'r', artifactId: 9 },
        path.join(dir, 'a.zip'),
        {
          maxBytes: 10,
        },
      ),
    ).rejects.toThrow(/expected a redirect/);

    nock(API)
      .get('/repos/o/r/actions/artifacts/9/zip')
      .reply(302, '', { location: 'https://blob.example.test/9.zip' });
    await expect(
      downloadArtifactZip(
        octokit,
        { owner: 'o', repo: 'r', artifactId: 9 },
        path.join(dir, 'a.zip'),
        {
          maxBytes: 10,
          fetchImpl: fetchZip(Buffer.alloc(0), { status: 403 }),
        },
      ),
    ).rejects.toThrow(/HTTP 403/);
  });
});

describe('extractZip', () => {
  it('extracts wanted files only and guards against zip slip', async () => {
    const dir = await tmpDir();
    const zipPath = path.join(dir, 'a.zip');
    await writeFile(
      zipPath,
      zipOf({
        'shots/a.png': png('a'),
        'shots/manifest.json': '{}',
        'shots/notes.txt': 'skip me',
        'big.png': Buffer.alloc(200),
        'dir/': Buffer.alloc(0),
      }),
    );
    const out = path.join(dir, 'out');

    const files = await extractZip(zipPath, out, {
      keep: keepImagesAndManifests,
      maxFileBytes: 100,
    });

    expect([...files.keys()].sort()).toEqual([
      'shots/a.png',
      'shots/manifest.json',
    ]);
    expect(await readFile(must(files.get('shots/a.png')).path)).toEqual(
      png('a'),
    );
    expect(must(files.get('shots/a.png')).size).toBe(png('a').length);
    expect(existsSync(path.join(out, 'big.png'))).toBe(false);
  });

  it('rejects a zip with escaping entry names instead of writing outside the target', async () => {
    const dir = await tmpDir();
    const zipPath = path.join(dir, 'evil.zip');
    await writeFile(zipPath, zipOf({ '../escape.png': png('evil') }));
    const out = path.join(dir, 'out');

    await expect(
      extractZip(zipPath, out, {
        keep: keepImagesAndManifests,
        maxFileBytes: 100,
      }),
    ).rejects.toThrow(/invalid relative path/);
    expect(existsSync(path.join(dir, 'escape.png'))).toBe(false);
  });
});

describe('findEntryFile', () => {
  const zipPaths = [
    'cypress/e2e/__image_snapshots__/a.png',
    'e2e/__image_snapshots__/b.png',
    'examples/next/cypress/e2e/__image_snapshots__/c.png',
    'x/cypress/e2e/__image_snapshots__/c.png',
  ];

  it('matches exact, shorter and longer variants of the manifest path', () => {
    expect(
      findEntryFile(zipPaths, 'cypress/e2e/__image_snapshots__/a.png'),
    ).toBe(zipPaths[0]);
    expect(
      findEntryFile(zipPaths, 'cypress/e2e/__image_snapshots__/b.png'),
    ).toBe(zipPaths[1]);
    expect(
      findEntryFile(zipPaths, './cypress/e2e/__image_snapshots__/a.png'),
    ).toBe(zipPaths[0]);
  });

  it('returns null on ambiguity or no match', () => {
    expect(
      findEntryFile(zipPaths, 'cypress/e2e/__image_snapshots__/c.png'),
    ).toBeNull();
    expect(findEntryFile(zipPaths, 'nope.png')).toBeNull();
    // a non segment-aligned suffix does not count
    expect(findEntryFile(['xa.png'], 'a.png')).toBeNull();
  });
});

describe('findManifestFiles', () => {
  it('matches the manifest glob', () => {
    expect(
      findManifestFiles(
        [
          'b/cp-visual-regression-diff-manifest.e2e.json',
          'a/cp-visual-regression-diff-manifest.component.json',
          'other.json',
        ],
        '**/*cp-visual-regression-diff-manifest*.json',
      ),
    ).toEqual([
      'a/cp-visual-regression-diff-manifest.component.json',
      'b/cp-visual-regression-diff-manifest.e2e.json',
    ]);
  });
});
