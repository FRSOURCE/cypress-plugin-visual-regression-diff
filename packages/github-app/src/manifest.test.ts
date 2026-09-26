import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fromImageTriples,
  fromPlaywrightReport,
  getManifestFileName,
  isManifestFileName,
  ManifestWriter,
  type PlaywrightJsonReport,
} from '@frsource/visual-regression-manifest';
import { describe, expect, it } from 'vitest';
import {
  ManifestParseError,
  mergeManifests,
  parseManifest,
  parseManifestJson,
  selectEntries,
  sourceLabel,
  type ManifestSource,
} from './manifest.js';
import {
  entry,
  HEAD_SHA,
  manifest,
  MANIFEST_ZIP_PATH,
  must,
  OTHER_SHA,
  tmpDir,
} from './test-utils.js';

const source = (
  m = manifest(),
  overrides: Partial<ManifestSource> = {},
): ManifestSource => ({
  artifactId: 9,
  artifactName: 'test',
  zipPath: MANIFEST_ZIP_PATH,
  manifest: m,
  ...overrides,
});

/** Verbatim output of `@frsource/cypress-plugin-visual-regression-diff` 4.3 for an e2e run on GitHub Actions. */
const pluginManifestJson = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '__fixtures__',
    getManifestFileName('e2e'),
  ),
  'utf8',
);

describe('parseManifest', () => {
  it('accepts a standard manifest and keeps unknown fields', () => {
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
    expect(() => parseManifestJson('not json', 'x')).toThrow(
      /Invalid manifest x: .*not valid JSON/,
    );
  });
});

describe('a manifest written by the Cypress plugin (4.3+)', () => {
  it('is named so that the default glob finds it', () => {
    expect(isManifestFileName(MANIFEST_ZIP_PATH)).toBe(true);
    expect(MANIFEST_ZIP_PATH).toBe(
      'cypress/screenshots/visual-regression-manifest.e2e.json',
    );
  });

  it('parses and merges through the app', () => {
    const where = sourceLabel({
      artifactName: 'test',
      zipPath: MANIFEST_ZIP_PATH,
    });
    const parsed = parseManifestJson(pluginManifestJson, where);
    expect(parsed.runner).toMatchObject({
      name: 'cypress',
      testingType: 'e2e',
    });

    const run = mergeManifests([source(parsed)], {
      headSha: HEAD_SHA,
      runId: 555,
      repository: 'o/r',
      projectRootHint: 'somewhere/else', // ci.workspace wins over the hint
    });
    expect(run.warnings).toEqual([]);
    expect(run.counts).toMatchObject({ passed: 1, failed: 1 });
    expect(run.entries.map((e) => e.entry.name)).toEqual([
      'about_#0',
      'home_#0',
    ]);
    expect(run.needsHuman.map((e) => e.entry.name)).toEqual(['home_#0']);
    const failed = must(run.needsHuman[0]);
    expect(failed.unapprovableReason).toBeUndefined();
    // paths are project-relative in the manifest, repository-relative for approving
    expect(failed.repoPaths).toEqual({
      baseline: 'examples/next/cypress/e2e/__image_snapshots__/home_#0.png',
      actual:
        'examples/next/cypress/e2e/__image_snapshots__/home_#0.actual.png',
      diff: 'examples/next/cypress/e2e/__image_snapshots__/home_#0.diff.png',
    });
    expect(failed.source).toMatchObject({
      artifactId: 9,
      artifactName: 'test',
      zipPath: MANIFEST_ZIP_PATH,
    });
    expect(
      selectEntries(run, { names: ['home_#0 (linux / chrome)'] }).entries,
    ).toEqual([failed]);
  });

  it('round-trips a manifest produced with the standard writer', async () => {
    const dir = await tmpDir();
    const writer = new ManifestWriter(
      path.join(dir, getManifestFileName('e2e')),
      {
        projectRoot: dir,
        runner: { name: 'cypress', version: '16.1.0', testingType: 'e2e' },
        options: {},
        ci: null,
        platform: { os: 'linux', arch: 'x64' },
      },
    );
    writer.record({
      actualPath: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      baselinePath: 'cypress/e2e/__image_snapshots__/home_#0.png',
      testFile: 'cypress/e2e/home.cy.ts',
      titlePath: ['home', 'renders'],
      retry: 0,
      status: 'failed',
      diffRatio: 0.2,
      threshold: 0.01,
      baselineWritten: false,
      platform: { os: 'linux', browser: { name: 'electron', version: '130' } },
      message: 'differs',
    });
    const text = readFileSync(
      path.join(dir, getManifestFileName('e2e')),
      'utf8',
    );
    const run = mergeManifests([source(parseManifestJson(text, 'w'))], {
      projectRootHint: '',
    });
    expect(run.needsHuman.map((e) => e.entry.name)).toEqual(['home_#0']);
    expect(must(run.needsHuman[0]).repoPaths.baseline).toBe(
      'cypress/e2e/__image_snapshots__/home_#0.png',
    );
  });
});

describe('manifests from the package converters (tools without a manifest of their own)', () => {
  const touch = async (dir: string, files: string[]) => {
    for (const file of files) {
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await writeFile(path.join(dir, file), file);
    }
  };

  it('parses and merges what fromImageTriples produces', async () => {
    const dir = await tmpDir();
    await touch(dir, [
      'shots/home.png',
      'shots/home.actual.png',
      'shots/home.diff.png',
      'shots/about.png',
    ]);
    const converted = fromImageTriples({
      projectRoot: dir,
      runner: { name: 'my-tool' },
      ci: null,
      platform: { os: 'linux', arch: 'x64' },
      triples: [
        {
          baseline: 'shots/home.png',
          testFile: 'tests/home.test.ts',
          titlePath: ['home'],
          diffRatio: 0.3,
          threshold: 0.01,
          platform: { os: 'linux', browser: { name: 'chromium' } },
        },
        { baseline: 'shots/about.png' },
      ],
    });

    const run = mergeManifests(
      [source(parseManifestJson(JSON.stringify(converted), 'triples'))],
      { projectRootHint: 'web' },
    );
    expect(run.warnings).toEqual([]);
    // statuses are inferred from the files left behind
    expect(run.counts).toMatchObject({ failed: 1, passed: 1 });
    const failed = must(run.needsHuman[0]);
    expect(failed.entry.name).toBe('home');
    expect(failed.unapprovableReason).toBeUndefined();
    expect(failed.repoPaths).toEqual({
      baseline: 'web/shots/home.png',
      actual: 'web/shots/home.actual.png',
      diff: 'web/shots/home.diff.png',
    });
    expect(
      selectEntries(run, { names: ['home (linux / chromium)'] }).entries,
    ).toEqual([failed]);
  });

  it('parses and merges what fromPlaywrightReport produces', async () => {
    const dir = await tmpDir();
    const results = 'test-results/home-header-renders-chromium';
    await touch(dir, [
      `${results}/header-expected.png`,
      `${results}/header-actual.png`,
      `${results}/header-diff.png`,
    ]);
    const report: PlaywrightJsonReport = {
      config: {
        rootDir: dir,
        version: '1.63.0',
        projects: [
          { id: 'chromium', name: 'chromium', testDir: `${dir}/tests` },
        ],
      },
      suites: [
        {
          title: 'home.spec.ts',
          file: 'tests/home.spec.ts',
          suites: [
            {
              title: 'header',
              file: 'tests/home.spec.ts',
              specs: [
                {
                  title: 'renders',
                  file: 'tests/home.spec.ts',
                  tests: [
                    {
                      projectName: 'chromium',
                      results: [
                        {
                          status: 'failed',
                          retry: 0,
                          startTime: '2026-09-25T10:00:00.000Z',
                          errors: [
                            {
                              message:
                                'Error: expect(page).toHaveScreenshot(expected) failed\n\n' +
                                '  8 pixels (ratio 0.02 of all image pixels) are different.\n\n' +
                                `Received: ${dir}/${results}/header-actual.png\n`,
                            },
                          ],
                          attachments: [
                            'header-expected.png',
                            'header-actual.png',
                            'header-diff.png',
                          ].map((name) => ({
                            name,
                            contentType: 'image/png',
                            path: `${dir}/${results}/${name}`,
                          })),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const converted = fromPlaywrightReport(report, {
      platform: 'linux',
      threshold: 0.01,
      ci: null,
    });

    const run = mergeManifests(
      [source(parseManifestJson(JSON.stringify(converted), 'playwright'))],
      { projectRootHint: '' },
    );
    expect(run.warnings).toEqual([]);
    expect(run.needsHuman.map((e) => e.entry.name)).toEqual([
      'header-chromium-linux',
    ]);
    const failed = must(run.needsHuman[0]);
    expect(failed.entry.status).toBe('failed');
    expect(failed.entry.comparison).toEqual({
      diffRatio: 0.02,
      threshold: 0.01,
    });
    expect(failed.unapprovableReason).toBeUndefined();
    // the baseline comes from the snapshot path template, the others from the report
    expect(failed.repoPaths).toEqual({
      baseline: 'tests/home.spec.ts-snapshots/header-chromium-linux.png',
      actual: `${results}/header-actual.png`,
      diff: `${results}/header-diff.png`,
    });
    expect(
      selectEntries(run, {
        names: ['header-chromium-linux (linux / chromium)'],
      }).entries,
    ).toEqual([failed]);
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
    expect(run.entries[1]?.source.artifactId).toBe(10);
    expect(run.entries[1]?.repoPaths).toEqual({
      baseline: 'cypress/e2e/__image_snapshots__/home_#0.png',
      actual: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      diff: 'cypress/e2e/__image_snapshots__/home_#0.diff.png',
    });
  });

  it('names the artifact and the zip path in warnings', () => {
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
    expect(warnings[0]).toMatch(
      /^test:cypress\/screenshots\/visual-regression-manifest\.e2e\.json: manifest was written for commit bbbbbbb/,
    );
    // a label given by the caller is kept
    expect(
      mergeManifests([source(m, { label: 'custom' })], { headSha: HEAD_SHA })
        .warnings[0],
    ).toMatch(/^custom: /);
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
    expect(
      mergeManifests([source(outside)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/outside the repository/);
    expect(
      mergeManifests([source(noActual)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/kept no/);
    expect(
      mergeManifests([source(badProject)]).warnings.some((w) =>
        w.includes('outside the checkout'),
      ),
    ).toBe(true);
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

  it('selects by key hash and by name', () => {
    const hash = must(run.entries[0]).keyHash;
    expect(
      selectEntries(run, { keyHashes: [hash, 'ffffffffffff'] }),
    ).toMatchObject({ entries: [run.entries[0]], unknown: ['ffffffffffff'] });
    const byName = selectEntries(run, { names: ['about_#0', 'nope'] });
    expect(byName.entries).toHaveLength(2);
    expect(byName.unknown).toEqual(['nope']);
    expect(
      selectEntries(run, { names: ['about_#0 (darwin / chrome)'] }).entries,
    ).toHaveLength(1);
  });
});
