import nock from 'nock';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { entryKey, keyHash } from '../manifest.js';
import { renderMarker } from '../report.js';
import {
  API,
  createTestProbot,
  entry,
  failingArtifactZip,
  fetchZip,
  HEAD_SHA,
  issueCommentPayload,
  mockArtifact,
  mockAuth,
  mockNoConfig,
  OTHER_SHA,
  pull,
  testEnv,
} from '../test-utils.js';
import { parseCommand, tokenize } from './issue-comment.js';

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
  await probot.receive({ id: '1', name: 'issue_comment', payload } as never);
};

describe('parseCommand', () => {
  it('reads the command from the first non-empty line', () => {
    const commands = ['approve-visuals', 'regenerate-visuals'];
    expect(parseCommand('/approve-visuals', commands)).toEqual({ names: [] });
    expect(
      parseCommand('\n  /Regenerate-Visuals `a b` "c d" e\nmore', commands),
    ).toEqual({
      names: ['a b', 'c d', 'e'],
    });
    expect(parseCommand('please /approve-visuals', commands)).toBeNull();
    expect(parseCommand('/deploy', commands)).toBeNull();
    expect(parseCommand('', commands)).toBeNull();
    expect(tokenize(`'single quoted' plain`)).toEqual([
      'single quoted',
      'plain',
    ]);
  });
});

describe('issue_comment.created', () => {
  it('approves the named screenshots, reacts and republishes', async () => {
    const reactions: string[] = [];
    let comment = '';
    let tree: Record<string, unknown> | undefined;
    const scope = nock(API);
    mockAuth(scope);
    mockNoConfig(scope);
    scope
      .post('/repos/o/r/issues/comments/900/reactions', (body) => {
        reactions.push(body.content);
        return true;
      })
      .times(2)
      .reply(201, {})
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'write' })
      .get('/repos/o/r/pulls/7')
      .reply(200, pull())
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .times(2)
      .reply(200, [{ id: 2, body: `${marker}\nold` }]);
    mockArtifact(scope);
    scope
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
      .post('/repos/o/r/git/commits')
      .reply(201, { sha: 'e'.repeat(40) })
      .patch('/repos/o/r/git/refs/heads%2Ffeat%2Fx')
      .reply(200, {})
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
      .patch('/repos/o/r/issues/comments/2', (body) => {
        comment = body.body;
        return true;
      })
      .reply(200, {});

    await receive(issueCommentPayload('/approve-visuals `home_#0`'));

    expect(scope.isDone()).toBe(true);
    expect(reactions).toEqual(['eyes', 'rocket']);
    expect((tree?.tree as { path: string }[])[0]?.path).toBe(BASELINE);
    expect(comment).toContain('approved by @alice in eeeeeee');
  });

  it('refuses users without write access', async () => {
    const reactions: string[] = [];
    let replyBody = '';
    const scope = nock(API);
    mockAuth(scope);
    mockNoConfig(scope);
    scope
      .post('/repos/o/r/issues/comments/900/reactions', (body) => {
        reactions.push(body.content);
        return true;
      })
      .times(2)
      .reply(201, {})
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'read' })
      .post('/repos/o/r/issues/7/comments', (body) => {
        replyBody = body.body;
        return true;
      })
      .reply(201, { id: 3 });

    await receive(issueCommentPayload('/approve-visuals'));

    expect(scope.isDone()).toBe(true);
    expect(reactions).toEqual(['eyes', 'confused']);
    expect(replyBody).toContain('@alice you need write access');
  });

  it('refuses a stale report and reports unknown names', async () => {
    const replies: string[] = [];
    const scope = nock(API);
    mockAuth(scope);
    mockNoConfig(scope);
    scope
      .post('/repos/o/r/issues/comments/900/reactions')
      .times(2)
      .reply(201, {})
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'write' })
      .get('/repos/o/r/pulls/7')
      .reply(
        200,
        pull({
          head: { sha: OTHER_SHA, ref: 'feat/x', repo: { full_name: 'o/r' } },
        }),
      )
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [{ id: 2, body: `${marker}\nold` }])
      .post('/repos/o/r/issues/7/comments', (body) => {
        replies.push(body.body);
        return true;
      })
      .reply(201, { id: 3 });

    await receive(issueCommentPayload('/approve-visuals'));

    expect(scope.isDone()).toBe(true);
    expect(replies[0]).toMatch(
      /report is for aaaaaaa but the branch is at bbbbbbb/,
    );
  });

  it('ignores comments that are not commands, bots and plain issues', async () => {
    const scope = nock(API);
    mockAuth(scope);
    mockNoConfig(scope);
    await receive(issueCommentPayload('looks good to me'));
    expect(scope.isDone()).toBe(true);

    const bot = nock(API);
    await receive(
      issueCommentPayload('/approve-visuals', {
        sender: { login: 'x[bot]', id: 2, type: 'Bot' },
      }),
    );
    await receive(
      issueCommentPayload('/approve-visuals', { issue: { number: 7 } }),
    );
    expect(bot.pendingMocks()).toEqual([]);
  });
});
