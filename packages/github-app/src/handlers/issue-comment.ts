import type { Context } from 'probot';
import { approve } from '../approve.js';
import { findComment, react, reply } from '../comment.js';
import { loadConfig } from '../config.js';
import type { Env } from '../env.js';
import { canApprove } from '../permissions.js';
import { prFromIssueComment } from '../pr.js';
import { publishReport, runUrlFor } from '../publish.js';
import { MARKER_PREFIX, parseMarker, type Approval } from '../report.js';
import { loadRun, readActualImage, type LoadRunDeps } from '../run.js';

/** Aliases accepted next to the configured command. */
export const BUILTIN_COMMANDS = ['approve-visuals', 'regenerate-visuals'];

/** Splits `` `a name` "another" bare `` into names; quotes keep spaces together. */
export const tokenize = (input: string): string[] => {
  const names: string[] = [];
  const re = /`([^`]+)`|"([^"]+)"|'([^']+)'|(\S+)/g;
  for (const match of input.matchAll(re)) {
    const name = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (name) names.push(name.trim());
  }
  return names;
};

/** `/approve-visuals [names…]` on the first non-empty line of a comment. */
export const parseCommand = (
  body: string,
  commands: string[],
): { names: string[] } | null => {
  const first = body
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  const match = first?.match(/^\/([a-z0-9][a-z0-9-]*)(?:\s+(.*))?$/i);
  if (!match || !commands.includes((match[1] as string).toLowerCase()))
    return null;
  return { names: tokenize(match[2] ?? '') };
};

export const handleIssueComment = async (
  context: Context<'issue_comment.created'>,
  env: Env,
  deps: LoadRunDeps = {},
): Promise<void> => {
  const { payload, octokit, log } = context;
  if (context.isBot || !payload.issue.pull_request) return;
  const installationId = payload.installation?.id;
  if (!installationId) return;

  const { config, error: configError } = await loadConfig(context);
  const command = parseCommand(payload.comment.body, [
    config.commentCommand.toLowerCase(),
    ...BUILTIN_COMMANDS,
  ]);
  if (!command) return;

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const repoRef = { owner, repo };
  const prNumber = payload.issue.number;
  const commentId = payload.comment.id;
  const actor = payload.comment.user;
  if (!actor) return;
  const refuse = async (message: string) => {
    await react(octokit, repoRef, commentId, 'confused');
    await reply(octokit, repoRef, prNumber, `@${actor.login} ${message}`);
  };

  await react(octokit, repoRef, commentId, 'eyes');

  if (!(await canApprove(octokit, owner, repo, actor))) {
    await refuse(
      'you need write access to this repository to approve baselines.',
    );
    return;
  }
  const pr = await prFromIssueComment(octokit, payload);
  if (!pr) return;
  const report = await findComment(octokit, repoRef, prNumber, MARKER_PREFIX);
  const state = report ? parseMarker(report.body) : null;
  if (!state) {
    await refuse(
      "there's no visual regression report on this pull request yet, so nothing to approve.",
    );
    return;
  }
  if (state.sha !== pr.headSha) {
    await refuse(
      `the report is for ${state.sha.slice(0, 7)} but the branch is at ${pr.headSha.slice(0, 7)} now. Wait for the current run to report.`,
    );
    return;
  }
  if (!pr.canPush) {
    await refuse(
      'this pull request comes from a fork, so I cannot push to it. Copy the `.actual.png` files over the baselines locally instead.',
    );
    return;
  }

  const loc = {
    installationId,
    owner,
    repo,
    runId: state.runId,
    attempt: state.attempt,
    headSha: state.sha,
  };
  const runUrl = runUrlFor(payload.repository.html_url, loc.runId, loc.attempt);
  const loaded = await loadRun(octokit, loc, config, env, deps);
  if (loaded.kind !== 'loaded') {
    await refuse(
      'the artifacts of that run are gone, so there is nothing to approve. Re-run the workflow.',
    );
    return;
  }

  const result = await approve(
    octokit,
    {
      owner,
      repo,
      branch: pr.headRef,
      expectedHeadSha: pr.headSha,
      selection: command.names.length ? { names: command.names } : 'all',
      actor: { login: actor.login, id: actor.id },
      commitMessage: config.commitMessage,
      runUrl,
    },
    { run: loaded.run, readActual: (entry) => readActualImage(loaded, entry) },
  );

  if (result.staleHead) {
    await refuse(
      `the branch moved to ${result.staleHead.slice(0, 7)} while I was working. Wait for the new report.`,
    );
    return;
  }

  const approved: Record<string, Approval> = {};
  for (const entry of result.approved) {
    approved[entry.keyHash] = {
      by: actor.login,
      sha: result.commitSha ?? loc.headSha,
    };
  }
  const problems: string[] = [];
  for (const { entry, reason } of result.skipped) {
    if (reason === 'already approved') {
      approved[entry.keyHash] = { by: actor.login, sha: loc.headSha };
    } else {
      problems.push(`\`${entry.entry.name}\`: ${reason}`);
    }
  }
  for (const name of result.unknown) {
    problems.push(`\`${name}\`: no such screenshot in this run`);
  }

  await publishReport({
    octokit,
    log,
    env,
    config,
    configError,
    loc,
    runUrl,
    pr,
    loaded,
    approved,
  });
  await react(
    octokit,
    repoRef,
    commentId,
    result.approved.length ? 'rocket' : 'confused',
  );
  if (problems.length || result.approved.length === 0) {
    const head = result.commitSha
      ? `approved ${result.approved.length} screenshot${result.approved.length === 1 ? '' : 's'} in ${result.commitSha.slice(0, 7)}.`
      : 'nothing was committed.';
    await reply(
      octokit,
      repoRef,
      prNumber,
      `@${actor.login} ${head}${problems.length ? `\n\n${problems.map((p) => `- ${p}`).join('\n')}` : ''}`,
    );
  }
};
