import type { Logger } from 'probot';
import type { ProbotOctokit } from 'probot';
import {
  ACTION_APPROVE,
  ACTION_APPROVE_ALL,
  ACTION_REFRESH,
  externalId,
  perImageCheckName,
  upsertCheck,
} from './checks.js';
import { findComment, upsertComment } from './comment.js';
import type { Config } from './config.js';
import type { Env } from './env.js';
import type { PrInfo } from './pr.js';
import {
  conclusionFor,
  displayName,
  MARKER_PREFIX,
  renderCheckSummary,
  renderComment,
  renderPerImageCheck,
  type Approval,
  type ReportContext,
} from './report.js';
import {
  imageUrlsFor,
  type EmptyRun,
  type LoadedRun,
  type RunLocator,
} from './run.js';

export type PublishInput = {
  octokit: ProbotOctokit;
  log: Logger;
  env: Env;
  config: Config;
  configError?: string;
  loc: RunLocator;
  runUrl: string;
  pr: PrInfo;
  loaded: LoadedRun | EmptyRun;
  approved?: Record<string, Approval>;
};

export const runUrlFor = (
  repoHtmlUrl: string,
  runId: number,
  attempt: number,
) =>
  `${repoHtmlUrl}/actions/runs/${runId}${attempt > 1 ? `/attempts/${attempt}` : ''}`;

/** Writes the summary check, the per-image checks and the PR comment for a run. */
export const publishReport = async (input: PublishInput): Promise<void> => {
  const { octokit, env, config, loc, pr, loaded } = input;
  const repoRef = { owner: loc.owner, repo: loc.repo };
  const checkRef = { runId: loc.runId, attempt: loc.attempt };

  if (loaded.kind !== 'loaded') {
    const reason =
      loaded.kind === 'no-artifacts'
        ? `No workflow artifact matched \`artifacts: ${JSON.stringify(config.artifacts)}\`${
            loaded.expiredArtifacts.length
              ? ` (${loaded.expiredArtifacts.length} matching artifact(s) had expired)`
              : ''
          }.`
        : `No file matching \`${config.manifestGlob}\` was found in the artifacts.`;
    const lines = [reason, ...loaded.warnings.map((w) => `- ${w}`)];
    if (input.configError) {
      lines.push(`- Config is invalid, using defaults: ${input.configError}`);
    }
    await upsertCheck(octokit, repoRef, {
      headSha: loc.headSha,
      name: config.checkName,
      externalId: externalId(checkRef),
      output: {
        title: 'No visual regression manifest found',
        summary: lines.join('\n'),
      },
      conclusion: 'neutral',
      detailsUrl: input.runUrl,
    });
    return;
  }

  const ctx: ReportContext = {
    run: loaded.run,
    runUrl: input.runUrl,
    runId: loc.runId,
    attempt: loc.attempt,
    headSha: loc.headSha,
    pr,
    config,
    images: imageUrlsFor(loaded, loc, config, env),
    approved: input.approved,
    configError: input.configError,
    expiredArtifacts: loaded.expiredArtifacts.map((a) => a.name),
  };
  const conclusion = conclusionFor(ctx);
  const openEntries = loaded.run.needsHuman.filter(
    (e) => !input.approved?.[e.keyHash],
  );

  await upsertCheck(octokit, repoRef, {
    headSha: loc.headSha,
    name: config.checkName,
    externalId: externalId(checkRef),
    output: renderCheckSummary(ctx),
    conclusion,
    actions:
      pr.canPush && openEntries.some((e) => !e.unapprovableReason)
        ? [ACTION_APPROVE_ALL, ACTION_REFRESH]
        : [ACTION_REFRESH],
    detailsUrl: input.runUrl,
  });

  for (const entry of loaded.run.needsHuman.slice(0, config.perImageChecks)) {
    const approval = input.approved?.[entry.keyHash];
    await upsertCheck(octokit, repoRef, {
      headSha: loc.headSha,
      name: perImageCheckName(config.checkName, displayName(entry, loaded.run)),
      externalId: externalId({ ...checkRef, keyHash: entry.keyHash }),
      output: renderPerImageCheck(entry, ctx),
      conclusion: approval ? 'success' : 'failure',
      actions:
        pr.canPush && !approval && !entry.unapprovableReason
          ? [ACTION_APPROVE]
          : [],
      detailsUrl: input.runUrl,
    });
  }

  const { counts } = loaded.run;
  const worthACommand =
    loaded.run.needsHuman.length > 0 ||
    counts.created + counts.updated + counts.approved > 0;
  const existing = worthACommand
    ? null
    : await findComment(octokit, repoRef, pr.number, MARKER_PREFIX);
  if (worthACommand || existing) {
    await upsertComment(
      octokit,
      repoRef,
      pr.number,
      MARKER_PREFIX,
      renderComment(ctx),
    );
  }
  input.log.info(
    {
      run: loc.runId,
      attempt: loc.attempt,
      conclusion,
      entries: loaded.run.entries.length,
    },
    'visual regression report published',
  );
};
