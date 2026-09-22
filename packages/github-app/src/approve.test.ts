import nock from 'nock';
import { ProbotOctokit } from 'probot';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { approve, gitBlobSha, renderCommitMessage } from './approve.js';
import { mergeManifests } from './manifest.js';
import {
  API,
  entry,
  HEAD_SHA,
  manifest,
  OTHER_SHA,
  png,
} from './test-utils.js';

const octokit = new ProbotOctokit({
  auth: { token: 'x' },
  retry: { enabled: false },
});

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

const BASELINE = 'cypress/e2e/__image_snapshots__/home_#0.png';
const run = () =>
  mergeManifests([
    {
      artifactId: 9,
      artifactName: 'test',
      zipPath: 'm.json',
      manifest: manifest([entry(), entry({ name: 'ok_#0', status: 'passed' })]),
    },
  ]);
const request = {
  owner: 'o',
  repo: 'r',
  branch: 'feat/x',
  expectedHeadSha: HEAD_SHA,
  selection: 'all' as const,
  actor: { login: 'alice', id: 1 },
  commitMessage: 'test: approve {count} ({names}) by {user}',
  runUrl: 'https://run',
};
const ref = () => nock(API).get('/repos/o/r/git/ref/heads%2Ffeat%2Fx');

describe('gitBlobSha', () => {
  it('matches git hash-object', () => {
    expect(gitBlobSha(Buffer.from('hello\n'))).toBe(
      'ce013625030ba8dba906f756967f9e9ca394464a',
    );
  });
});

describe('renderCommitMessage', () => {
  it('fills the placeholders', () => {
    expect(
      renderCommitMessage('test: approve {count} ({names}) by {user} {run}', {
        count: 2,
        names: ['a', 'b'],
        user: 'alice',
        run: 'url',
      }),
    ).toBe('test: approve 2 (a, b) by alice url');
  });
});

describe('approve', () => {
  it('commits the selected .actual.png files over their baselines in one commit', async () => {
    const actual = png('actual');
    let tree: unknown;
    let commit: Record<string, unknown> | undefined;
    ref().reply(200, { object: { sha: HEAD_SHA } });
    nock(API)
      .get(`/repos/o/r/contents/${encodeURIComponent(BASELINE)}`)
      .query({ ref: HEAD_SHA })
      .reply(200, { type: 'file', sha: 'old-blob' })
      .post('/repos/o/r/git/blobs', {
        content: actual.toString('base64'),
        encoding: 'base64',
      })
      .reply(201, { sha: 'new-blob' })
      .get(`/repos/o/r/git/commits/${HEAD_SHA}`)
      .reply(200, { tree: { sha: 'tree-0' } })
      .post('/repos/o/r/git/trees', (body) => {
        tree = body;
        return true;
      })
      .reply(201, { sha: 'tree-1' })
      .post('/repos/o/r/git/commits', (body) => {
        commit = body;
        return true;
      })
      .reply(201, { sha: 'commit-1' })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx', {
        sha: 'commit-1',
        force: false,
      })
      .reply(200, {});

    const result = await approve(octokit, request, {
      run: run(),
      readActual: async () => actual,
    });

    expect(result).toMatchObject({
      commitSha: 'commit-1',
      unknown: [],
      skipped: [],
    });
    expect(result.approved.map((e) => e.entry.name)).toEqual(['home_#0']);
    expect(tree).toEqual({
      base_tree: 'tree-0',
      tree: [{ path: BASELINE, mode: '100644', type: 'blob', sha: 'new-blob' }],
    });
    expect(commit).toMatchObject({
      message: 'test: approve 1 (home_#0) by alice',
      parents: [HEAD_SHA],
      author: { name: 'alice', email: '1+alice@users.noreply.github.com' },
    });
  });

  it('skips files that already hold the same bytes and entries without an actual image', async () => {
    const actual = png('actual');
    ref().reply(200, { object: { sha: HEAD_SHA } });
    nock(API)
      .get(`/repos/o/r/contents/${encodeURIComponent(BASELINE)}`)
      .query({ ref: HEAD_SHA })
      .reply(200, { type: 'file', sha: gitBlobSha(actual) });

    const result = await approve(octokit, request, {
      run: run(),
      readActual: async () => actual,
    });
    expect(result.commitSha).toBeNull();
    expect(result.skipped.map((s) => s.reason)).toEqual(['already approved']);

    ref().reply(200, { object: { sha: HEAD_SHA } });
    const missing = await approve(octokit, request, {
      run: run(),
      readActual: async () => null,
    });
    expect(missing.skipped[0]?.reason).toMatch(/not in the artifact/);
  });

  it('treats a missing baseline as a new file', async () => {
    const actual = png('actual');
    ref().reply(200, { object: { sha: HEAD_SHA } });
    nock(API)
      .get(`/repos/o/r/contents/${encodeURIComponent(BASELINE)}`)
      .query({ ref: HEAD_SHA })
      .reply(404, { message: 'Not Found' })
      .post('/repos/o/r/git/blobs')
      .reply(201, { sha: 'new-blob' })
      .get(`/repos/o/r/git/commits/${HEAD_SHA}`)
      .reply(200, { tree: { sha: 'tree-0' } })
      .post('/repos/o/r/git/trees')
      .reply(201, { sha: 'tree-1' })
      .post('/repos/o/r/git/commits')
      .reply(201, { sha: 'commit-1' })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx')
      .reply(200, {});
    const result = await approve(octokit, request, {
      run: run(),
      readActual: async () => actual,
    });
    expect(result.commitSha).toBe('commit-1');
  });

  it('does nothing when the branch moved on', async () => {
    ref().reply(200, { object: { sha: OTHER_SHA } });
    const result = await approve(octokit, request, {
      run: run(),
      readActual: async () => png('x'),
    });
    expect(result).toMatchObject({
      commitSha: null,
      staleHead: OTHER_SHA,
      approved: [],
    });
  });

  it('retries once on a non-fast-forward update and gives up if the head changed', async () => {
    const actual = png('actual');
    ref().reply(200, { object: { sha: HEAD_SHA } });
    nock(API)
      .get(`/repos/o/r/contents/${encodeURIComponent(BASELINE)}`)
      .query({ ref: HEAD_SHA })
      .reply(404, {})
      .post('/repos/o/r/git/blobs')
      .reply(201, { sha: 'new-blob' })
      .get(`/repos/o/r/git/commits/${HEAD_SHA}`)
      .times(2)
      .reply(200, { tree: { sha: 'tree-0' } })
      .post('/repos/o/r/git/trees')
      .times(2)
      .reply(201, { sha: 'tree-1' })
      .post('/repos/o/r/git/commits')
      .times(2)
      .reply(201, { sha: 'commit-1' })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx')
      .reply(422, { message: 'Update is not a fast forward' })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx')
      .reply(200, {});
    ref().reply(200, { object: { sha: HEAD_SHA } });

    const retried = await approve(octokit, request, {
      run: run(),
      readActual: async () => actual,
    });
    expect(retried.commitSha).toBe('commit-1');

    ref().reply(200, { object: { sha: HEAD_SHA } });
    nock(API)
      .get(`/repos/o/r/contents/${encodeURIComponent(BASELINE)}`)
      .query({ ref: HEAD_SHA })
      .reply(404, {})
      .post('/repos/o/r/git/blobs')
      .reply(201, { sha: 'new-blob' })
      .get(`/repos/o/r/git/commits/${HEAD_SHA}`)
      .reply(200, { tree: { sha: 'tree-0' } })
      .post('/repos/o/r/git/trees')
      .reply(201, { sha: 'tree-1' })
      .post('/repos/o/r/git/commits')
      .reply(201, { sha: 'commit-1' })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx')
      .reply(422, { message: 'Update is not a fast forward' });
    ref().reply(200, { object: { sha: OTHER_SHA } });

    const moved = await approve(octokit, request, {
      run: run(),
      readActual: async () => actual,
    });
    expect(moved).toMatchObject({ commitSha: null, staleHead: OTHER_SHA });
  });

  it('refuses approve-all for colliding platforms and reports unknown names', async () => {
    const collide = mergeManifests([
      {
        artifactId: 9,
        artifactName: 'test',
        zipPath: 'm.json',
        manifest: manifest([
          entry(),
          entry({
            platform: {
              os: 'darwin',
              browser: { name: 'chrome', version: '1' },
            },
          }),
        ]),
      },
    ]);
    ref().reply(200, { object: { sha: HEAD_SHA } });
    const all = await approve(octokit, request, {
      run: collide,
      readActual: async () => png('x'),
    });
    expect(all.commitSha).toBeNull();
    expect(all.skipped.every((s) => /one by one/.test(s.reason))).toBe(true);

    ref().reply(200, { object: { sha: HEAD_SHA } });
    const named = await approve(
      octokit,
      { ...request, selection: { names: ['ghost_#0', 'ok_#0'] } },
      { run: run(), readActual: async () => png('x') },
    );
    expect(named.unknown).toEqual(['ghost_#0']);
    expect(named.skipped[0]?.reason).toBe('status is `passed`');
  });
});
