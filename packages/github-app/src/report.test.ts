import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config.js';
import { mergeManifests, type MergedEntry } from './manifest.js';
import { toPrInfo } from './pr.js';
import {
  conclusionFor,
  headline,
  parseMarker,
  renderCheckSummary,
  renderComment,
  renderMarker,
  renderPerImageCheck,
  truncate,
  type ReportContext,
} from './report.js';
import { entry, HEAD_SHA, manifest, must, pull } from './test-utils.js';

const ctxFor = (
  entries = [entry()],
  overrides: Partial<ReportContext> = {},
): ReportContext => ({
  run: mergeManifests([
    {
      artifactId: 9,
      artifactName: 'test',
      zipPath: 'm.json',
      manifest: manifest(entries),
    },
  ]),
  runUrl: 'https://github.com/o/r/actions/runs/555',
  runId: 555,
  attempt: 1,
  headSha: HEAD_SHA,
  pr: toPrInfo(pull()),
  config: DEFAULT_CONFIG,
  images: (e: MergedEntry) => ({
    baseline: `https://vr.test/img/${e.keyHash}-old`,
    diff: `https://vr.test/img/${e.keyHash}-diff`,
    actual: `https://vr.test/img/${e.keyHash}-new`,
  }),
  ...overrides,
});

describe('marker', () => {
  it('round-trips', () => {
    const marker = renderMarker({ runId: 555, attempt: 2, sha: HEAD_SHA });
    expect(parseMarker(`hello\n${marker}\nworld`)).toEqual({
      runId: 555,
      attempt: 2,
      sha: HEAD_SHA,
    });
    expect(parseMarker('nothing here')).toBeNull();
  });
});

describe('renderComment', () => {
  it('lists failed entries with thumbnails and the command hint', () => {
    const body = renderComment(ctxFor());
    expect(body).toContain(
      renderMarker({ runId: 555, attempt: 1, sha: HEAD_SHA }),
    );
    expect(body).toContain('1 screenshot needs a look');
    expect(body).toContain('`home_#0`');
    expect(body).toContain('❌ failed');
    expect(body).toContain('<img src="https://vr.test/img/');
    expect(body).toContain('/approve-visuals');
    expect(body).toContain('linux / electron');
  });

  it('collapses the overflow and lists quiet entries', () => {
    const entries = [
      ...Array.from({ length: 25 }, (_, i) => entry({ name: `shot_#${i}` })),
      entry({ name: 'fine_#0', status: 'passed' }),
      entry({ name: 'fresh_#0', status: 'created' }),
    ];
    const body = renderComment(
      ctxFor(entries, {
        config: { ...DEFAULT_CONFIG, images: false },
        images: () => null,
      }),
    );
    expect(body).toContain('5 more screenshots need a look');
    expect(body).toContain('2 screenshots without action needed');
    expect(body).toContain('_images disabled_');
    expect(body).toContain('🆕 created');
  });

  it('shows approvals, fork and config notes', () => {
    const ctx = ctxFor([entry()], {
      pr: toPrInfo(
        pull({
          head: { sha: HEAD_SHA, ref: 'x', repo: { full_name: 'someone/r' } },
        }),
      ),
      configError: 'perImageChecks: too small',
    });
    ctx.approved = {
      [must(ctx.run.entries[0]).keyHash]: { by: 'alice', sha: 'd'.repeat(40) },
    };
    const body = renderComment(ctx);
    expect(body).toContain('approved by @alice in ddddddd');
    expect(body).toContain('comes from a fork');
    expect(body).toContain('perImageChecks: too small');
    expect(body).not.toContain('Approve everything with');
    expect(headline(ctx)).toBe('1 approved from this report, 0 passed');
    expect(conclusionFor(ctx)).toBe('success');
  });

  it('explains unapprovable and colliding entries', () => {
    const linux = entry();
    const mac = entry({
      platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
    });
    const outside = entry({
      name: 'outside_#0',
      images: { ...entry().images, baseline: { path: '../../out.png' } },
    });
    const body = renderComment(ctxFor([linux, mac, outside]));
    expect(body).toContain('`home_#0 (linux / electron)`');
    expect(body).toContain('shares its baseline file with another platform');
    expect(body).toContain('cannot be approved from here');
  });
});

describe('renderCheckSummary', () => {
  it('renders a table of non-passing entries and the run link', () => {
    const { title, summary, text } = renderCheckSummary(
      ctxFor([entry(), entry({ name: 'ok_#0', status: 'passed' })]),
    );
    expect(title).toBe('1 screenshot needs a look, 1 passed');
    expect(summary).toContain('[Run](https://github.com/o/r/actions/runs/555)');
    expect(summary).toContain('cypress 16.1.0 electron v130');
    expect(summary).toContain('| `home_#0` |');
    expect(summary).not.toContain('`ok_#0`');
    expect(text).toContain('/approve-visuals');
  });

  it('says so when everything passed', () => {
    const { summary, text } = renderCheckSummary(
      ctxFor([entry({ status: 'passed' })]),
    );
    expect(summary).toContain('Every comparison passed.');
    expect(text).toBeUndefined();
  });
});

describe('renderPerImageCheck', () => {
  it('embeds the images and the message', () => {
    const ctx = ctxFor();
    const { title, summary } = renderPerImageCheck(
      must(ctx.run.entries[0]),
      ctx,
    );
    expect(title).toBe('failed · diff 12.00% (threshold 1.00%)');
    expect(summary).toContain('![baseline](https://vr.test/img/');
    expect(summary).toContain('Image diff factor');
    ctx.approved = {
      [must(ctx.run.entries[0]).keyHash]: { by: 'bob', sha: 'e'.repeat(40) },
    };
    expect(renderPerImageCheck(must(ctx.run.entries[0]), ctx).title).toBe(
      'Approved by @bob in eeeeeee',
    );
  });
});

describe('truncate', () => {
  it('keeps the marker and appends a note', () => {
    const marker = '<!-- m -->';
    const body = `${marker}\n${'x'.repeat(200)}`;
    const cut = truncate(body, 100, marker);
    expect(cut.length).toBeLessThanOrEqual(100 + 10);
    expect(cut.startsWith(marker)).toBe(true);
    expect(cut).toContain('report truncated');
    expect(truncate('short', 100, marker)).toBe('short');
  });
});
