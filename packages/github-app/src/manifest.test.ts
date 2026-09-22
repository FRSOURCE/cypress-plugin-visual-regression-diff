import { describe, expect, it } from 'vitest';
import {
  entryKey,
  isSafeRelativePath,
  keyHash,
  ManifestParseError,
  mergeManifests,
  parseManifest,
  platformLabel,
  projectDirInRepo,
  selectEntries,
  toRepoPath,
  type ManifestSource,
} from './manifest.js';
import { entry, HEAD_SHA, manifest, must, OTHER_SHA } from './test-utils.js';

const source = (
  m = manifest(),
  overrides: Partial<ManifestSource> = {},
): ManifestSource => ({
  artifactId: 9,
  artifactName: 'test',
  zipPath: 'cypress/screenshots/cp-visual-regression-diff-manifest.e2e.json',
  manifest: m,
  ...overrides,
});

describe('parseManifest', () => {
  it('accepts a plugin manifest and keeps unknown fields', () => {
    const parsed = parseManifest(
      { ...manifest(), extra: { future: true } },
      'test:m.json',
    );
    expect(parsed.entries).toHaveLength(1);
    expect((parsed as unknown as { extra: unknown }).extra).toEqual({
      future: true,
    });
  });

  it('rejects other versions and broken entries', () => {
    expect(() => parseManifest({ ...manifest(), version: 2 }, 'x')).toThrow(
      ManifestParseError,
    );
    expect(() =>
      parseManifest(manifest([{ ...entry(), status: 'weird' } as never]), 'x'),
    ).toThrow(/status/);
    expect(() => parseManifest('nope', 'x')).toThrow(/Invalid manifest x/);
  });
});

describe('paths', () => {
  it('isSafeRelativePath', () => {
    expect(isSafeRelativePath('a/b.png')).toBe(true);
    expect(isSafeRelativePath('a/../b.png')).toBe(false);
    expect(isSafeRelativePath('/a.png')).toBe(false);
    expect(isSafeRelativePath('C:/a.png')).toBe(false);
    expect(isSafeRelativePath('a\\b.png')).toBe(false);
    expect(isSafeRelativePath('a//b.png')).toBe(false);
    expect(isSafeRelativePath('./a.png')).toBe(false);
    expect(isSafeRelativePath('')).toBe(false);
    expect(isSafeRelativePath('a\u0000.png')).toBe(false);
  });

  it('projectDirInRepo uses ci.workspace when present, else the hint', () => {
    expect(projectDirInRepo(manifest())).toBe('');
    expect(
      projectDirInRepo(
        manifest([], { projectRoot: '/home/runner/work/r/r/examples/next/' }),
      ),
    ).toBe('examples/next');
    expect(
      projectDirInRepo(
        manifest([], {
          projectRoot: 'D:\\a\\r\\r\\apps\\web',
          ci: { provider: 'github', workspace: 'D:\\a\\r\\r' },
        }),
      ),
    ).toBe('apps/web');
    expect(
      projectDirInRepo(manifest([], { projectRoot: '/elsewhere' })),
    ).toBeNull();
    expect(
      projectDirInRepo(manifest([], { ci: null }), './examples/next/'),
    ).toBe('examples/next');
    expect(projectDirInRepo(manifest([], { ci: null }))).toBe('');
  });

  it('toRepoPath joins and refuses escapes', () => {
    expect(toRepoPath('', 'a/b.png')).toBe('a/b.png');
    expect(toRepoPath('examples/next', 'a/b.png')).toBe(
      'examples/next/a/b.png',
    );
    // an absolute imagesPath one level up still lands inside the repository
    expect(toRepoPath('examples/next', '../shared/b.png')).toBe(
      'examples/shared/b.png',
    );
    expect(toRepoPath('', '../b.png')).toBeNull();
    expect(toRepoPath('', null)).toBeNull();
    expect(toRepoPath(null, 'a.png')).toBeNull();
  });
});

describe('entryKey', () => {
  it('distinguishes platforms and is stable', () => {
    const a = entry();
    const b = entry({
      platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
    });
    expect(entryKey(a)).not.toBe(entryKey(b));
    expect(keyHash(entryKey(a))).toMatch(/^[0-9a-f]{12}$/);
    expect(platformLabel(a)).toBe('linux / electron');
    expect(platformLabel(entry({ platform: undefined }))).toBe('');
  });
});

describe('mergeManifests', () => {
  it('merges entries across sources, later attempts winning', () => {
    const first = manifest([entry({ status: 'failed' })]);
    const retried = manifest([entry({ status: 'passed' })], {
      ci: { ...must(manifest().ci), runAttempt: '2' },
    });
    const other = manifest(
      [
        entry({
          name: 'about_#0',
          platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
        }),
      ],
      { ci: null },
    );
    const run = mergeManifests(
      [
        source(retried, { artifactId: 10 }),
        source(first),
        source(other, { artifactId: 11 }),
      ],
      { headSha: HEAD_SHA, runId: 555, repository: 'o/r' },
    );
    expect(
      run.entries.map((e) => [e.entry.name, e.entry.status, e.runAttempt]),
    ).toEqual([
      ['about_#0', 'failed', 1],
      ['home_#0', 'passed', 2],
    ]);
    expect(run.counts).toMatchObject({ passed: 1, failed: 1 });
    expect(run.needsHuman.map((e) => e.entry.name)).toEqual(['about_#0']);
    expect(run.warnings).toEqual([]);
    expect(run.entries[1]?.repoPaths).toEqual({
      baseline: 'cypress/e2e/__image_snapshots__/home_#0.png',
      actual: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      diff: 'cypress/e2e/__image_snapshots__/home_#0.diff.png',
    });
  });

  it('warns when the manifest does not match the run', () => {
    const m = manifest([], {
      ci: {
        ...must(manifest().ci),
        pullRequest: { number: 7, headSha: OTHER_SHA },
        runId: '1',
        repository: 'x/y',
      },
    });
    const { warnings } = mergeManifests([source(m)], {
      headSha: HEAD_SHA,
      runId: 555,
      repository: 'o/r',
    });
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toMatch(/written for commit bbbbbbb/);
  });

  it('marks entries that cannot be approved from CI', () => {
    const outside = manifest([
      entry({
        images: { ...entry().images, baseline: { path: '../../outside.png' } },
      }),
    ]);
    const noActual = manifest([
      entry({ images: { ...entry().images, actual: { path: null } } }),
    ]);
    const badProject = manifest([entry()], { projectRoot: '/other/place' });
    const run = mergeManifests([
      source(outside),
      source(noActual, { artifactId: 2 }),
      source(badProject, { artifactId: 3 }),
    ]);
    // all three share the same key, the last source wins; check reasons one by one instead
    expect(
      mergeManifests([source(outside)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/outside the repository/);
    expect(
      mergeManifests([source(noActual)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/kept no/);
    expect(run.warnings.some((w) => w.includes('outside the checkout'))).toBe(
      true,
    );
  });

  it('detects two platforms writing the same baseline', () => {
    const linux = entry();
    const mac = entry({
      platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
    });
    const run = mergeManifests([source(manifest([linux, mac]))]);
    expect(run.needsHuman).toHaveLength(2);
    expect(run.needsHuman[0]?.collidesWith).toEqual([
      run.needsHuman[1]?.keyHash,
    ]);
  });
});

describe('selectEntries', () => {
  const run = mergeManifests([
    source(
      manifest([
        entry(),
        entry({ name: 'about_#0' }),
        entry({
          name: 'about_#0',
          platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
        }),
      ]),
    ),
  ]);

  it('selects everything that needs a human', () => {
    expect(selectEntries(run, 'all').entries).toHaveLength(3);
  });

  it('selects by key hash and reports unknown hashes', () => {
    const hash = must(run.entries[0]).keyHash;
    expect(
      selectEntries(run, { keyHashes: [hash, 'ffffffffffff'] }),
    ).toMatchObject({
      entries: [run.entries[0]],
      unknown: ['ffffffffffff'],
    });
  });

  it('selects by name, including the platform-suffixed form', () => {
    const byName = selectEntries(run, { names: ['about_#0', 'nope'] });
    expect(byName.entries).toHaveLength(2);
    expect(byName.unknown).toEqual(['nope']);
    expect(
      selectEntries(run, { names: ['about_#0 (darwin / chrome)'] }).entries,
    ).toHaveLength(1);
  });
});
