import type { ProbotOctokit } from 'probot';

export type RepoRef = { owner: string; repo: string };

/** Creates or edits the app's single report comment on a PR, found by `marker`. */
export const upsertComment = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  prNumber: number,
  marker: string,
  body: string,
): Promise<{ id: number; created: boolean }> => {
  const existing = await findComment(
    octokit,
    { owner, repo },
    prNumber,
    marker,
  );
  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    return { id: existing.id, created: false };
  }
  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  return { id: data.id, created: true };
};

export const findComment = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  prNumber: number,
  marker: string,
): Promise<{ id: number; body: string } | null> => {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  const mine = comments.find((c) => c.body?.includes(marker));
  return mine ? { id: mine.id, body: mine.body ?? '' } : null;
};

export type Reaction = 'eyes' | 'rocket' | 'confused' | '-1' | '+1';

export const react = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  commentId: number,
  content: Reaction,
) => {
  await octokit.rest.reactions.createForIssueComment({
    owner,
    repo,
    comment_id: commentId,
    content,
  });
};

export const reply = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  prNumber: number,
  body: string,
) => {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
};
