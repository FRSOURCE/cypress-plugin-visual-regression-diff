import type { ManifestStatus } from '@frsource/visual-regression-manifest';
import type { Config } from './config.js';
import {
  needsHuman,
  platformLabel,
  type MergedEntry,
  type MergedRun,
} from './manifest.js';
import type { PrInfo } from './pr.js';

export const MARKER_PREFIX = '<!-- cpvrd-github-app:report';

export type MarkerState = { runId: number; attempt: number; sha: string };

export const renderMarker = ({ runId, attempt, sha }: MarkerState) =>
  `${MARKER_PREFIX} run=${runId} attempt=${attempt} sha=${sha} -->`;

export const parseMarker = (body: string): MarkerState | null => {
  const match = body.match(
    /<!-- cpvrd-github-app:report run=(\d+) attempt=(\d+) sha=([0-9a-f]{7,40}) -->/,
  );
  if (!match) return null;
  return {
    runId: Number(match[1]),
    attempt: Number(match[2]),
    sha: match[3] as string,
  };
};

export type ImageUrls = { baseline?: string; diff?: string; actual?: string };

export type Approval = { by: string; sha: string };

export type ReportContext = {
  run: MergedRun;
  runUrl: string;
  runId: number;
  attempt: number;
  headSha: string;
  pr: PrInfo;
  config: Config;
  /** Signed image links for an entry, `null` when images are off or missing. */
  images: (entry: MergedEntry) => ImageUrls | null;
  /** Entries approved from this report, by key hash. */
  approved?: Record<string, Approval>;
  /** Config validation error, shown as a note. */
  configError?: string;
  /** Artifacts that matched but had already expired. */
  expiredArtifacts?: string[];
};

const STATUS_LABEL: Record<ManifestStatus, string> = {
  passed: 'passed',
  failed: 'failed',
  'missing-baseline': 'missing baseline',
  created: 'created',
  updated: 'updated',
  approved: 'approved',
};

const STATUS_ICON: Record<ManifestStatus, string> = {
  passed: '✅',
  failed: '❌',
  'missing-baseline': '❓',
  created: '🆕',
  updated: '♻️',
  approved: '👍',
};

const percent = (ratio: number) => `${(ratio * 100).toFixed(2)}%`;

const code = (value: string) => `\`${value.replace(/`/g, '')}\``;

const escapeCell = (value: string) => value.replace(/\|/g, '\\|');

/** Screenshot name, with the platform appended when several platforms share it. */
export const displayName = (entry: MergedEntry, run: MergedRun) => {
  const same = run.entries.filter((e) => e.entry.name === entry.entry.name);
  return same.length > 1 && platformLabel(entry.entry)
    ? `${entry.entry.name} (${platformLabel(entry.entry)})`
    : entry.entry.name;
};

const statusCell = (entry: MergedEntry, ctx: ReportContext) => {
  const approval = ctx.approved?.[entry.keyHash];
  if (approval) {
    return `${STATUS_ICON.approved} approved by @${approval.by} in ${approval.sha.slice(0, 7)}`;
  }
  return `${STATUS_ICON[entry.entry.status]} ${STATUS_LABEL[entry.entry.status]}`;
};

const testCell = (entry: MergedEntry) =>
  `${code(entry.entry.test.file)}<br>${escapeCell(entry.entry.test.titlePath.join(' › '))}`;

export const headline = (ctx: ReportContext) => {
  const { counts } = ctx.run;
  const approvedNow = Object.keys(ctx.approved ?? {}).length;
  const open = ctx.run.needsHuman.filter(
    (e) => !ctx.approved?.[e.keyHash],
  ).length;
  const parts: string[] = [];
  if (open > 0)
    parts.push(
      `${open} screenshot${open === 1 ? '' : 's'} need${open === 1 ? 's' : ''} a look`,
    );
  if (approvedNow > 0) parts.push(`${approvedNow} approved from this report`);
  if (counts.created > 0) parts.push(`${counts.created} new`);
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.approved > 0) parts.push(`${counts.approved} approved locally`);
  parts.push(`${counts.passed} passed`);
  return parts.join(', ');
};

export const conclusionFor = (ctx: ReportContext): 'success' | 'failure' => {
  const open = ctx.run.needsHuman.filter((e) => !ctx.approved?.[e.keyHash]);
  return open.length > 0 ? 'failure' : 'success';
};

const notes = (ctx: ReportContext) => {
  const lines: string[] = [];
  if (ctx.configError) {
    lines.push(
      `Config \`.github/visual-regression.yml\` is invalid, using defaults: ${ctx.configError}`,
    );
  }
  for (const name of ctx.expiredArtifacts ?? []) {
    lines.push(`Artifact ${code(name)} has expired; it was ignored.`);
  }
  for (const warning of ctx.run.warnings) lines.push(warning);
  for (const entry of ctx.run.needsHuman) {
    if (entry.unapprovableReason) {
      lines.push(
        `${code(displayName(entry, ctx.run))} cannot be approved from here: ${entry.unapprovableReason}.`,
      );
    } else if (entry.collidesWith.length > 0) {
      lines.push(
        `${code(displayName(entry, ctx.run))} shares its baseline file with another platform; approve it on its own, not with "Approve all".`,
      );
    }
  }
  if (ctx.pr.isFork) {
    lines.push(
      'This pull request comes from a fork, so the app cannot push approved baselines to it. Copy the `.actual.png` files over the baselines locally instead.',
    );
  }
  return lines.length
    ? `\n**Notes**\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`
    : '';
};

const runner = (ctx: ReportContext) => {
  const r = ctx.run.sources[0]?.manifest.runner;
  if (!r) return '';
  const bits = [
    r.name,
    r.version,
    r.browser?.name,
    r.browser?.version && `v${r.browser.version}`,
  ]
    .filter(Boolean)
    .join(' ');
  return bits ? ` · ${bits}` : '';
};

/** Body of the summary check run. */
export const renderCheckSummary = (
  ctx: ReportContext,
): { title: string; summary: string; text?: string } => {
  const title = headline(ctx);
  const rows = ctx.run.entries
    .filter((e) => e.entry.status !== 'passed')
    .map(
      (e) =>
        `| ${code(displayName(e, ctx.run))} | ${testCell(e)} | ${statusCell(e, ctx)} | ${percent(e.entry.comparison.diffRatio)} / ${percent(e.entry.comparison.threshold)} | ${escapeCell(platformLabel(e.entry) || '–')} |`,
    );
  const table = rows.length
    ? `| screenshot | test | status | diff / threshold | platform |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}`
    : 'Every comparison passed.';
  const summary = `[Run](${ctx.runUrl})${runner(ctx)} · commit ${ctx.headSha.slice(0, 7)}\n\n${table}\n${notes(ctx)}`;
  const text = ctx.run.needsHuman.length
    ? `Approve from the buttons on this check, or comment \`/${ctx.config.commentCommand}\` (all) or \`/${ctx.config.commentCommand} \`name\` …\` (some) on the pull request.`
    : undefined;
  return { title, summary, text };
};

/** Body of a per-image check run. */
export const renderPerImageCheck = (
  entry: MergedEntry,
  ctx: ReportContext,
): { title: string; summary: string } => {
  const approval = ctx.approved?.[entry.keyHash];
  const title = approval
    ? `Approved by @${approval.by} in ${approval.sha.slice(0, 7)}`
    : `${STATUS_LABEL[entry.entry.status]} · diff ${percent(entry.entry.comparison.diffRatio)} (threshold ${percent(entry.entry.comparison.threshold)})`;
  const urls = ctx.images(entry);
  const images = urls
    ? ['baseline', 'diff', 'actual']
        .filter((k) => urls[k as keyof ImageUrls])
        .map((k) => `**${k}**\n\n![${k}](${urls[k as keyof ImageUrls]})`)
        .join('\n\n')
    : '';
  const summary = `${testCell(entry).replace('<br>', ' › ')}\n\n${entry.entry.message}\n\n${images}`;
  return { title, summary };
};

const thumbnails = (entry: MergedEntry, urls: ImageUrls | null) => {
  if (!urls) return '_images disabled_';
  const cell = (label: string, url?: string) =>
    url
      ? `<a href="${url}"><img src="${url}" width="240" alt="${label}"></a>`
      : '–';
  return `<table><tr><th>old</th><th>diff</th><th>new</th></tr><tr><td>${cell('baseline', urls.baseline)}</td><td>${cell('diff', urls.diff)}</td><td>${cell('actual', urls.actual)}</td></tr></table>`;
};

/** The single PR comment. */
export const renderComment = (ctx: ReportContext): string => {
  const marker = renderMarker({
    runId: ctx.runId,
    attempt: ctx.attempt,
    sha: ctx.headSha,
  });
  const lines: string[] = [
    marker,
    '',
    `### Visual regression: ${headline(ctx)}`,
    '',
    `[Run](${ctx.runUrl})${runner(ctx)} · commit ${ctx.headSha.slice(0, 7)}`,
    '',
  ];

  const open = ctx.run.needsHuman;
  const shown = open.slice(0, ctx.config.maxCommentEntries);
  const rest = open.slice(ctx.config.maxCommentEntries);
  for (const entry of shown) {
    lines.push(
      `#### ${code(displayName(entry, ctx.run))} · ${statusCell(entry, ctx)}`,
      '',
      `${testCell(entry).replace('<br>', ' › ')} · diff ${percent(entry.entry.comparison.diffRatio)}, threshold ${percent(entry.entry.comparison.threshold)}${platformLabel(entry.entry) ? ` · ${platformLabel(entry.entry)}` : ''}`,
      '',
      thumbnails(entry, ctx.images(entry)),
      '',
    );
  }
  if (rest.length) {
    lines.push(
      `<details><summary>${rest.length} more screenshot${rest.length === 1 ? '' : 's'} need a look</summary>`,
      '',
      ...rest.map(
        (e) =>
          `- ${code(displayName(e, ctx.run))} · ${statusCell(e, ctx)} · diff ${percent(e.entry.comparison.diffRatio)}`,
      ),
      '',
      '</details>',
      '',
    );
  }

  const quiet = ctx.run.entries.filter((e) => !needsHuman(e.entry.status));
  if (quiet.length) {
    lines.push(
      `<details><summary>${quiet.length} screenshot${quiet.length === 1 ? '' : 's'} without action needed</summary>`,
      '',
      ...quiet.map(
        (e) => `- ${code(displayName(e, ctx.run))} · ${statusCell(e, ctx)}`,
      ),
      '',
      '</details>',
      '',
    );
  }

  lines.push(notes(ctx));
  if (open.some((e) => !ctx.approved?.[e.keyHash]) && ctx.pr.canPush) {
    lines.push(
      `Approve everything with \`/${ctx.config.commentCommand}\`, or pick some: \`/${ctx.config.commentCommand} \`${shown[0] ? displayName(shown[0], ctx.run) : 'name'}\`\`. The buttons on the "${ctx.config.checkName}" checks do the same.`,
    );
  }
  return truncate(lines.join('\n'), 65000, marker);
};

/** Keeps the body under GitHub's comment limit without losing the marker. */
export const truncate = (body: string, max: number, marker: string) => {
  if (body.length <= max) return body;
  const tail =
    '\n\n_… report truncated, see the check run for the full table._';
  const cut = body.slice(0, max - tail.length);
  const withMarker = cut.includes(marker)
    ? cut
    : `${marker}\n${cut.slice(marker.length + 1)}`;
  return `${withMarker}${tail}`;
};
