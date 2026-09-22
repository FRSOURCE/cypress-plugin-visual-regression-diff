import type { Context, ProbotOctokit } from 'probot';

export type PrInfo = {
  number: number;
  headSha: string;
  headRef: string;
  /** `owner/repo` of the branch, or `null` when the fork was deleted. */
  headRepo: string | null;
  baseRepo: string;
  isFork: boolean;
  /** The app can only push to branches of the base repository. */
  canPush: boolean;
};

type PullLike = {
  number: number;
  head: { sha: string; ref: string; repo: { full_name: string } | null };
  base: { repo: { full_name: string } };
};

export const toPrInfo = (pull: PullLike): PrInfo => {
  const headRepo = pull.head.repo?.full_name ?? null;
  const isFork = headRepo !== pull.base.repo.full_name;
  return {
    number: pull.number,
    headSha: pull.head.sha,
    headRef: pull.head.ref,
    headRepo,
    baseRepo: pull.base.repo.full_name,
    isFork,
    canPush: !isFork,
  };
};

const getPull = async (
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  pull_number: number,
) =>
  toPrInfo((await octokit.rest.pulls.get({ owner, repo, pull_number })).data);

const openPrForCommit = async (
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  commit_sha: string,
) => {
  const { data } =
    await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha,
      per_page: 100,
    });
  const open = data.find((p) => p.state === 'open') ?? data[0];
  return open ? toPrInfo(open) : null;
};

/**
 * `workflow_run.pull_requests` is empty for runs triggered from forks, so fall
 * back to the PRs associated with the head commit, then to a head-branch search.
 */
export const prFromWorkflowRun = async (
  octokit: ProbotOctokit,
  payload: Context<'workflow_run.completed'>['payload'],
): Promise<PrInfo | null> => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const run = payload.workflow_run;
  const listed = run.pull_requests?.[0]?.number;
  if (listed) return getPull(octokit, owner, repo, listed);

  const byCommit = await openPrForCommit(octokit, owner, repo, run.head_sha);
  if (byCommit) return byCommit;

  const headOwner = run.head_repository?.owner?.login;
  if (headOwner && run.head_branch) {
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
      head: `${headOwner}:${run.head_branch}`,
      per_page: 1,
    });
    if (data[0]) return toPrInfo(data[0]);
  }
  return null;
};

export const prFromCheckRun = async (
  octokit: ProbotOctokit,
  payload: Context<'check_run.requested_action'>['payload'],
): Promise<PrInfo | null> => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const listed = payload.check_run.pull_requests?.[0]?.number;
  if (listed) return getPull(octokit, owner, repo, listed);
  return openPrForCommit(octokit, owner, repo, payload.check_run.head_sha);
};

export const prFromIssueComment = async (
  octokit: ProbotOctokit,
  payload: Context<'issue_comment.created'>['payload'],
): Promise<PrInfo | null> => {
  if (!payload.issue.pull_request) return null;
  return getPull(
    octokit,
    payload.repository.owner.login,
    payload.repository.name,
    payload.issue.number,
  );
};
