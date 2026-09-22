import type { Context } from 'probot';
import { approve, type Selection } from '../approve.js';
import { parseExternalId } from '../checks.js';
import { loadConfig } from '../config.js';
import type { Env } from '../env.js';
import { canApprove } from '../permissions.js';
import { prFromCheckRun } from '../pr.js';
import { publishReport, runUrlFor } from '../publish.js';
import type { Approval } from '../report.js';
import { loadRun, readActualImage, type LoadRunDeps } from '../run.js';

export const handleCheckRun = async (
  context: Context<'check_run.requested_action'>,
  env: Env,
  deps: LoadRunDeps = {},
): Promise<void> => {
  const { payload, octokit, log } = context;
  const ref = parseExternalId(payload.check_run.external_id);
  const identifier = payload.requested_action?.identifier;
  const installationId = payload.installation?.id;
  if (!ref || !installationId) return;
  if (
    identifier !== 'refresh' &&
    identifier !== 'approve' &&
    identifier !== 'approve-all'
  ) {
    return;
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const checkRunId = payload.check_run.id;
  const explain = (title: string, summary: string) =>
    octokit.rest.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      output: { title, summary },
    });

  const pr = await prFromCheckRun(octokit, payload);
  if (!pr) {
    await explain(
      'No pull request',
      'This check does not belong to an open pull request any more.',
    );
    return;
  }
  const { config, error: configError } = await loadConfig(context);
  const loc = {
    installationId,
    owner,
    repo,
    runId: ref.runId,
    attempt: ref.attempt,
    headSha: payload.check_run.head_sha,
  };
  const runUrl = runUrlFor(payload.repository.html_url, loc.runId, loc.attempt);
  const publish = (
    loaded: Awaited<ReturnType<typeof loadRun>>,
    approved?: Record<string, Approval>,
  ) =>
    publishReport({
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

  if (identifier === 'refresh') {
    await publish(await loadRun(octokit, loc, config, env, deps));
    return;
  }
  if (identifier !== 'approve' && identifier !== 'approve-all') return;

  const actor = payload.sender;
  if (!(await canApprove(octokit, owner, repo, actor))) {
    await explain(
      'Approval refused',
      `@${actor.login} needs write access to this repository to approve baselines.`,
    );
    return;
  }
  if (!pr.canPush) {
    await explain(
      'Cannot push to a fork',
      'The app can only commit to branches of this repository. Copy the `.actual.png` files over the baselines locally instead.',
    );
    return;
  }

  const loaded = await loadRun(octokit, loc, config, env, deps);
  if (loaded.kind !== 'loaded') {
    await explain(
      'Artifacts are gone',
      'The workflow artifacts of this run are no longer available, so there is nothing to approve. Re-run the workflow.',
    );
    return;
  }

  const selection: Selection =
    identifier === 'approve-all'
      ? 'all'
      : { keyHashes: ref.keyHash ? [ref.keyHash] : [] };
  await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    status: 'in_progress',
    output: { title: 'Approving…', summary: `Requested by @${actor.login}.` },
  });

  const result = await approve(
    octokit,
    {
      owner,
      repo,
      branch: pr.headRef,
      expectedHeadSha: payload.check_run.head_sha,
      selection,
      actor: { login: actor.login, id: actor.id },
      commitMessage: config.commitMessage,
      runUrl,
    },
    { run: loaded.run, readActual: (entry) => readActualImage(loaded, entry) },
  );

  if (result.staleHead) {
    await publish(loaded);
    await explain(
      'Branch moved on',
      `\`${pr.headRef}\` now points at ${result.staleHead.slice(0, 7)}, this report was made for ${loc.headSha.slice(0, 7)}. Wait for the new run's report.`,
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
  for (const { entry, reason } of result.skipped) {
    if (reason === 'already approved') {
      approved[entry.keyHash] = { by: actor.login, sha: loc.headSha };
    }
  }
  await publish(loaded, approved);
  if (result.skipped.some((s) => s.reason !== 'already approved')) {
    log.info(
      {
        skipped: result.skipped.map(
          (s) => `${s.entry.entry.name}: ${s.reason}`,
        ),
      },
      'some screenshots were not approved',
    );
  }
};
