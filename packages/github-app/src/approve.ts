import { createHash } from 'node:crypto';
import type { ProbotOctokit } from 'probot';
import type { RepoRef } from './comment.js';
import { renderTemplate } from './config.js';
import {
  needsHuman,
  selectEntries,
  type MergedEntry,
  type MergedRun,
} from './manifest.js';

export type Selection = 'all' | { keyHashes: string[] } | { names: string[] };

export type Actor = { login: string; id: number };

export type ApproveRequest = RepoRef & {
  branch: string;
  /** Head SHA the report was made for; the branch must still point at it. */
  expectedHeadSha: string;
  selection: Selection;
  actor: Actor;
  commitMessage: string;
  runUrl: string;
};

export type Skipped = { entry: MergedEntry; reason: string };

export type ApproveResult = {
  /** `null` when nothing had to be committed. */
  commitSha: string | null;
  approved: MergedEntry[];
  skipped: Skipped[];
  unknown: string[];
  /** The branch moved since the report; nothing was committed. */
  staleHead?: string;
};

export type ApproveDeps = {
  run: MergedRun;
  /** Bytes of the entry's `.actual.png` from the artifact, `null` when missing. */
  readActual: (entry: MergedEntry) => Promise<Buffer | null>;
};

/** Git's blob object id, equal to the tree entry sha GitHub reports for the file. */
export const gitBlobSha = (bytes: Buffer) =>
  createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');

export const renderCommitMessage = (
  template: string,
  vars: { count: number; names: string[]; user: string; run: string },
) =>
  renderTemplate(template, {
    count: vars.count,
    names: vars.names.join(', '),
    user: vars.user,
    run: vars.run,
  });

// one approval at a time per branch within this process
const locks = new Map<string, Promise<unknown>>();
const withLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const previous = locks.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(fn);
  locks.set(key, current);
  try {
    return await current;
  } finally {
    if (locks.get(key) === current) locks.delete(key);
  }
};

const isUnprocessable = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { status?: number }).status === 422;

const isNotFound = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { status?: number }).status === 404;

/** Blob sha of `path` at `ref`, or `null` when the file does not exist there. */
export const existingBlobSha = async (
  octokit: ProbotOctokit,
  { owner, repo }: RepoRef,
  ref: string,
  path: string,
): Promise<string | null> => {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    return !Array.isArray(data) && data.type === 'file' ? data.sha : null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

/**
 * Copies the selected `.actual.png` files over their baselines in one commit
 * on the PR branch (Git Data API: blobs → tree → commit → ref). Files whose
 * baseline already has the same bytes are skipped, so a redelivered click is
 * a no-op. The ref update is a compare-and-swap; on a race it is retried once.
 */
export const approve = async (
  octokit: ProbotOctokit,
  req: ApproveRequest,
  deps: ApproveDeps,
): Promise<ApproveResult> =>
  withLock(`${req.owner}/${req.repo}#${req.branch}`, async () => {
    const { owner, repo, branch } = req;
    const repoRef = { owner, repo };
    const readHead = async () =>
      (await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` }))
        .data.object.sha;

    let headSha = await readHead();
    if (headSha !== req.expectedHeadSha) {
      return {
        commitSha: null,
        approved: [],
        skipped: [],
        unknown: [],
        staleHead: headSha,
      };
    }

    const { entries, unknown } = selectEntries(deps.run, req.selection);
    const skipped: Skipped[] = [];
    const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] =
      [];
    const approved: MergedEntry[] = [];
    const approveAll = req.selection === 'all';

    for (const merged of entries) {
      const { entry } = merged;
      if (!needsHuman(entry.status)) {
        skipped.push({
          entry: merged,
          reason: `status is \`${entry.status}\``,
        });
        continue;
      }
      if (merged.unapprovableReason || !merged.repoPaths.baseline) {
        skipped.push({
          entry: merged,
          reason: merged.unapprovableReason ?? 'baseline path unknown',
        });
        continue;
      }
      if (approveAll && merged.collidesWith.length > 0) {
        skipped.push({
          entry: merged,
          reason:
            'several platforms write this baseline; approve them one by one',
        });
        continue;
      }
      const bytes = await deps.readActual(merged);
      if (!bytes) {
        skipped.push({
          entry: merged,
          reason: 'the `.actual.png` is not in the artifact any more',
        });
        continue;
      }
      const wanted = gitBlobSha(bytes);
      const current = await existingBlobSha(
        octokit,
        repoRef,
        headSha,
        merged.repoPaths.baseline,
      );
      if (current === wanted) {
        skipped.push({ entry: merged, reason: 'already approved' });
        continue;
      }
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: bytes.toString('base64'),
        encoding: 'base64',
      });
      tree.push({
        path: merged.repoPaths.baseline,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      approved.push(merged);
    }

    if (tree.length === 0) {
      return { commitSha: null, approved, skipped, unknown };
    }

    const message = renderCommitMessage(req.commitMessage, {
      count: approved.length,
      names: approved.map((e) => e.entry.name),
      user: req.actor.login,
      run: req.runUrl,
    });
    const author = {
      name: req.actor.login,
      email: `${req.actor.id}+${req.actor.login}@users.noreply.github.com`,
    };

    const commitOnto = async (parentSha: string) => {
      const { data: parent } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: parentSha,
      });
      const { data: newTree } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: parent.tree.sha,
        tree,
      });
      const { data: commit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [parentSha],
        author,
      });
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.sha,
        force: false,
      });
      return commit.sha;
    };

    try {
      return {
        commitSha: await commitOnto(headSha),
        approved,
        skipped,
        unknown,
      };
    } catch (error) {
      if (!isUnprocessable(error)) throw error;
      // non-fast-forward: somebody pushed in between
      headSha = await readHead();
      if (headSha !== req.expectedHeadSha) {
        return {
          commitSha: null,
          approved: [],
          skipped,
          unknown,
          staleHead: headSha,
        };
      }
      return {
        commitSha: await commitOnto(headSha),
        approved,
        skipped,
        unknown,
      };
    }
  });
