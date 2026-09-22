import type { ProbotOctokit } from 'probot';
import type { RepoRef } from './comment.js';

export type CheckAction = {
  label: string;
  description: string;
  identifier: string;
};

export type CheckRunRef = { runId: number; attempt: number; keyHash?: string };

/** `<runId>.<attempt>[.<keyHash>]`, stored in `external_id` so a redelivery updates instead of duplicating. */
export const externalId = ({ runId, attempt, keyHash }: CheckRunRef) =>
  keyHash ? `${runId}.${attempt}.${keyHash}` : `${runId}.${attempt}`;

export const parseExternalId = (
  value: string | null | undefined,
): CheckRunRef | null => {
  const match = value?.match(/^(\d+)\.(\d+)(?:\.([0-9a-f]{12}))?$/);
  if (!match) return null;
  return {
    runId: Number(match[1]),
    attempt: Number(match[2]),
    keyHash: match[3],
  };
};

export const perImageCheckName = (base: string, name: string) =>
  `${base}: ${name}`.slice(0, 255);

/** GitHub limits check-run actions to 3, with label ≤ 20, description ≤ 40 and identifier ≤ 20 chars. */
export const action = (
  label: string,
  description: string,
  identifier: string,
): CheckAction => ({
  label: label.slice(0, 20),
  description: description.slice(0, 40),
  identifier: identifier.slice(0, 20),
});

export const ACTION_APPROVE_ALL = action(
  'Approve all',
  'Commit every .actual.png as baseline',
  'approve-all',
);
export const ACTION_REFRESH = action(
  'Refresh report',
  'Re-read the artifacts of this run',
  'refresh',
);
export const ACTION_APPROVE = action(
  'Approve',
  'Commit this .actual.png as the baseline',
  'approve',
);

export type CheckOutput = { title: string; summary: string; text?: string };
export type Conclusion = 'success' | 'failure' | 'neutral';

export type UpsertCheckInput = {
  headSha: string;
  name: string;
  externalId: string;
  output: CheckOutput;
  conclusion?: Conclusion;
  status?: 'queued' | 'in_progress' | 'completed';
  actions?: CheckAction[];
  detailsUrl?: string;
};

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const clipOutput = (output: CheckOutput): CheckOutput => ({
  title: clip(output.title, 255),
  summary: clip(output.summary, 65535),
  ...(output.text !== undefined && { text: clip(output.text, 65535) }),
});

/** Finds our check run for this ref by `external_id` and updates it, or creates it. */
export const upsertCheck = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  input: UpsertCheckInput,
): Promise<number> => {
  const existing = await octokit.paginate(octokit.rest.checks.listForRef, {
    owner,
    repo,
    ref: input.headSha,
    check_name: input.name,
    per_page: 100,
  });
  const mine = existing.find((c) => c.external_id === input.externalId);
  const status = input.status ?? 'completed';
  const shared = {
    owner,
    repo,
    name: input.name,
    external_id: input.externalId,
    status,
    ...(status === 'completed' && {
      conclusion: input.conclusion ?? 'neutral',
    }),
    output: clipOutput(input.output),
    actions: (input.actions ?? []).slice(0, 3),
    ...(input.detailsUrl && { details_url: input.detailsUrl }),
  };
  if (mine) {
    await octokit.rest.checks.update({ ...shared, check_run_id: mine.id });
    return mine.id;
  }
  const { data } = await octokit.rest.checks.create({
    ...shared,
    head_sha: input.headSha,
  });
  return data.id;
};

/** Every check run this app created for a ref (summary + per-image ones), by `external_id`. */
export const listOwnChecks = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  headSha: string,
  ref: CheckRunRef,
) => {
  const prefix = `${externalId({ runId: ref.runId, attempt: ref.attempt })}`;
  const all = await octokit.paginate(octokit.rest.checks.listForRef, {
    owner,
    repo,
    ref: headSha,
    per_page: 100,
  });
  return all.filter(
    (c) => c.external_id === prefix || c.external_id?.startsWith(`${prefix}.`),
  );
};
