import type { Context } from 'probot';
import { loadConfig } from '../config.js';
import type { Env } from '../env.js';
import { prFromWorkflowRun } from '../pr.js';
import { publishReport, runUrlFor } from '../publish.js';
import { loadRun, type LoadRunDeps } from '../run.js';

/** Workflow triggers whose runs can belong to a pull request. */
const EVENTS = new Set(['pull_request', 'pull_request_target', 'push']);

export const handleWorkflowRun = async (
  context: Context<'workflow_run.completed'>,
  env: Env,
  deps: LoadRunDeps = {},
): Promise<void> => {
  const { payload, octokit, log } = context;
  const run = payload.workflow_run;
  if (!EVENTS.has(run.event)) return;
  if (run.conclusion === 'skipped' || run.conclusion === 'cancelled') return;
  const installationId = payload.installation?.id;
  if (!installationId) return;

  const pr = await prFromWorkflowRun(octokit, payload);
  if (!pr) {
    log.debug({ run: run.id }, 'workflow run has no open pull request');
    return;
  }

  const { config, error: configError } = await loadConfig(context);
  const loc = {
    installationId,
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    runId: run.id,
    attempt: run.run_attempt ?? 1,
    headSha: run.head_sha,
  };
  const loaded = await loadRun(octokit, loc, config, env, deps);
  await publishReport({
    octokit,
    log,
    env,
    config,
    configError,
    loc,
    runUrl: runUrlFor(payload.repository.html_url, loc.runId, loc.attempt),
    pr,
    loaded,
  });
};
