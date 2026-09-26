import nock from 'nock';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { entryKey, keyHash } from '../manifest.js';
import { renderMarker } from '../report.js';
import {
  API,
  checkRunPayload,
  createTestProbot,
  entry,
  failingArtifactZip,
  fetchZip,
  HEAD_SHA,
  mockArtifact,
  mockAuth,
  mockNoConfig,
  OTHER_SHA,
  pull,
  testEnv,
} from '../test-utils.js';

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

const HASH = keyHash(entryKey(entry()));
const BASELINE = 'cypress/e2e/__image_snapshots__/home_#0.png';
const marker = renderMarker({ runId: 555, attempt: 1, sha: HEAD_SHA });

const receive = async (payload: unknown) => {
  const probot = await createTestProbot(
    createApp({
      env: await testEnv(),
      fetchImpl: fetchZip(failingArtifactZip()),
    }),
  );
  await probot.receive({ id: '1', name: 'check_run', payload } as never);
};

/** Everything the re-published report touches after an approval: existing checks + existing comment. */
const mockRepublish = (scope: nock.Scope, onComment: (body: string) => void) =>
  scope
    .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
    .query(true)
    .times(2)
    .reply(200, {
      total_count: 2,
      check_runs: [
        { id: 70, external_id: '555.1' },
        { id: 77, external_id: `555.1.${HASH}` },
      ],
    })
    .patch('/repos/o/r/check-runs/70')
    .reply(200, {})
    .patch('/repos/o/r/check-runs/77')
    .reply(200, {})
    .get('/repos/o/r/issues/7/comments')
    .query(true)
    .reply(200, [{ id: 2, body: `${marker}\nold report` }])
    .patch('/repos/o/r/issues/comments/2', (body) => {
      onComment(body.body);
      return true;
    })
    .reply(200, {});

describe('check_run.requested_action', () => {
  it('approves one screenshot from its button and republishes the report', async () => {
    let tree: Record<string, unknown> | undefined;
    let comment = '';
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(200, pull());
    mockNoConfig(scope);
    scope
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'write' });
    mockArtifact(scope);
    scope
      .patch(
        '/repos/o/r/check-runs/77',
        (body) => body.status === 'in_progress',
      )
      .reply(200, {})
      .get('/repos/o/r/git/ref/heads%2Ffeat%2Fx')
      .reply(200, { object: { sha: HEAD_SHA } })
      .get(`/repos/o/r/contents/${encodeURIComponent(BASELINE)}`)
      .query(true)
      .reply(404, {})
      .post('/repos/o/r/git/blobs')
      .reply(201, { sha: 'blob-1' })
      .get(`/repos/o/r/git/commits/${HEAD_SHA}`)
      .reply(200, { tree: { sha: 'tree-0' } })
      .post('/repos/o/r/git/trees', (body) => {
        tree = body;
        return true;
      })
      .reply(201, { sha: 'tree-1' })
      .post('/repos/o/r/git/commits', (body) => body.author.name === 'alice')
      .reply(201, { sha: 'd'.repeat(40) })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx')
      .reply(200, {});
    mockRepublish(scope, (body) => {
      comment = body;
    });

    await receive(checkRunPayload(`555.1.${HASH}`, 'approve'));

    expect(scope.isDone()).toBe(true);
    expect(tree).toEqual({
      base_tree: 'tree-0',
      tree: [{ path: BASELINE, mode: '100644', type: 'blob', sha: 'blob-1' }],
    });
    expect(comment).toContain('approved by @alice in ddddddd');
    expect(comment).toContain('1 approved from this report');
  });

  it('refuses users without write access and explains on the check run', async () => {
    let output: Record<string, unknown> | undefined;
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(200, pull());
    mockNoConfig(scope);
    scope
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'read' })
      .patch('/repos/o/r/check-runs/77', (body) => {
        output = body.output;
        return true;
      })
      .reply(200, {});

    await receive(checkRunPayload('555.1', 'approve-all'));

    expect(scope.isDone()).toBe(true);
    expect(output).toMatchObject({ title: 'Approval refused' });
  });

  it('explains when the branch moved since the report', async () => {
    const titles: string[] = [];
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(
      200,
      pull({
        head: { sha: OTHER_SHA, ref: 'feat/x', repo: { full_name: 'o/r' } },
      }),
    );
    mockNoConfig(scope);
    scope
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'admin' });
    mockArtifact(scope);
    scope
      .patch('/repos/o/r/check-runs/77', (body) => {
        titles.push(body.output?.title);
        return true;
      })
      .times(3)
      .reply(200, {})
      .get('/repos/o/r/git/ref/heads%2Ffeat%2Fx')
      .reply(200, { object: { sha: OTHER_SHA } })
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .times(2)
      .reply(200, {
        total_count: 1,
        check_runs: [{ id: 77, external_id: `555.1.${HASH}` }],
      })
      .post('/repos/o/r/check-runs')
      .reply(201, { id: 70 })
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [])
      .post('/repos/o/r/issues/7/comments')
      .reply(201, { id: 2 });

    await receive(checkRunPayload(`555.1.${HASH}`, 'approve'));

    expect(scope.isDone()).toBe(true);
    expect(titles).toContain('Branch moved on');
  });

  it('refreshes the report on request and ignores unknown actions', async () => {
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(200, pull());
    mockNoConfig(scope);
    mockArtifact(scope);
    scope
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .times(2)
      .reply(200, { total_count: 0, check_runs: [] })
      .post('/repos/o/r/check-runs')
      .times(2)
      .reply(201, { id: 1 })
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [])
      .post('/repos/o/r/issues/7/comments')
      .reply(201, { id: 2 });

    await receive(checkRunPayload('555.1', 'refresh'));
    expect(scope.isDone()).toBe(true);

    await receive(checkRunPayload('555.1', 'dance'));
    await receive(checkRunPayload('not-ours', 'approve'));
    expect(scope.pendingMocks()).toEqual([]);
  });
});
