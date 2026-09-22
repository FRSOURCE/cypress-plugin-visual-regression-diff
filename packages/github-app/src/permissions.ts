import type { ProbotOctokit } from 'probot';

const ALLOWED = new Set(['admin', 'maintain', 'write']);

/** Only humans with push rights may replace baselines. */
export const canApprove = async (
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  actor: { login: string; type?: string },
): Promise<boolean> => {
  if (actor.type === 'Bot') return false;
  try {
    const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: actor.login,
    });
    return ALLOWED.has(data.permission) || ALLOWED.has(data.role_name ?? '');
  } catch {
    return false;
  }
};
