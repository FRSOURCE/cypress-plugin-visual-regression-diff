import nock from 'nock';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import {
  API,
  createTestProbot,
  failingArtifactZip,
  fetchZip,
  HEAD_SHA,
  mockArtifact,
  mockAuth,
  mockNoConfig,
  pull,
  testEnv,
  workflowRunPayload,
} from '../test-utils.js';

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

const receive = async (
  payload: unknown,
  zip = failingArtifactZip(),
  envOverrides = {},
) => {
  const env = await testEnv(envOverrides);
  const probot = await createTestProbot(
    createApp({ env, fetchImpl: fetchZip(zip) }),
  );
  await probot.receive({ id: '1', name: 'workflow_run', payload } as never);
  return env;
};

const checksBaseline = (scope: nock.Scope) =>
  scope
    .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
    .query(true)
    .times(2)
    .reply(200, { total_count: 0, check_runs: [] });

describe('workflow_run.completed', () => {
  it('publishes a failing summary check, a per-image check and a comment with thumbnails', async () => {
    const checks: Record<string, unknown>[] = [];
    let comment: Record<string, unknown> | undefined;
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(200, pull());
    mockNoConfig(scope);
    mockArtifact(scope);
    checksBaseline(scope)
      .post('/repos/o/r/check-runs', (body) => {
        checks.push(body);
        return true;
      })
      .times(2)
      .reply(201, { id: 1 })
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [])
      .post('/repos/o/r/issues/7/comments', (body) => {
        comment = body;
        return true;
      })
      .reply(201, { id: 2 });

    await receive(workflowRunPayload());

    expect(scope.isDone()).toBe(true);
    const summary = checks.find((c) => c.external_id === '555.1');
    expect(summary).toMatchObject({
      name: 'Visual regression',
      head_sha: HEAD_SHA,
      conclusion: 'failure',
      details_url: 'https://github.com/o/r/actions/runs/555',
    });
    expect(
      (summary?.actions as { identifier: string }[]).map((a) => a.identifier),
    ).toEqual(['approve-all', 'refresh']);
    expect((summary?.output as { title: string }).title).toBe(
      '1 screenshot needs a look, 0 passed',
    );
    const perImage = checks.find((c) => c.external_id !== '555.1');
    expect(perImage).toMatchObject({
      name: 'Visual regression: home_#0',
      conclusion: 'failure',
    });
    expect(perImage?.external_id).toMatch(/^555\.1\.[0-9a-f]{12}$/);
    expect(
      (perImage?.actions as { identifier: string }[]).map((a) => a.identifier),
    ).toEqual(['approve']);
    const body = comment?.body as string;
    expect(body).toContain(
      '<!-- cpvrd-github-app:report run=555 attempt=1 sha=' + HEAD_SHA,
    );
    expect(body).toContain('https://vr.example.test/img/');
    expect(body).toContain('`home_#0`');
  });

  it('posts a neutral check and no comment when no artifact matches', async () => {
    let check: Record<string, unknown> | undefined;
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(200, pull());
    mockNoConfig(scope);
    scope
      .get('/repos/o/r/actions/runs/555/artifacts')
      .query(true)
      .reply(200, { total_count: 0, artifacts: [] })
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .reply(200, { total_count: 0, check_runs: [] })
      .post('/repos/o/r/check-runs', (body) => {
        check = body;
        return true;
      })
      .reply(201, { id: 1 });

    await receive(workflowRunPayload());

    expect(scope.isDone()).toBe(true);
    expect(check).toMatchObject({
      conclusion: 'neutral',
      output: { title: 'No visual regression manifest found' },
    });
  });

  it('ignores runs that cannot belong to a pull request', async () => {
    const scope = nock(API);
    await receive(workflowRunPayload({ event: 'schedule' }));
    await receive(workflowRunPayload({ conclusion: 'skipped' }));
    expect(scope.pendingMocks()).toEqual([]);

    mockAuth(scope);
    scope
      .get(`/repos/o/r/commits/${HEAD_SHA}/pulls`)
      .query(true)
      .reply(200, []);
    await receive(
      workflowRunPayload({
        event: 'push',
        pull_requests: [],
        head_repository: null,
      }),
    );
    expect(scope.isDone()).toBe(true);
  });

  it('honours a repo config that turns images off and renames the command', async () => {
    let comment: Record<string, unknown> | undefined;
    const scope = nock(API);
    mockAuth(scope);
    scope.get('/repos/o/r/pulls/7').reply(200, pull());
    // octokit-plugin-config asks for the raw file
    scope
      .get(/\/repos\/o\/r\/contents\/.*visual-regression\.yml/)
      .reply(
        200,
        'images: false\ncommentCommand: approve-shots\nperImageChecks: 0\n',
        {
          'content-type': 'text/plain; charset=utf-8',
        },
      );
    mockArtifact(scope);
    scope
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .reply(200, { total_count: 0, check_runs: [] })
      .post('/repos/o/r/check-runs')
      .reply(201, { id: 1 })
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [])
      .post('/repos/o/r/issues/7/comments', (body) => {
        comment = body;
        return true;
      })
      .reply(201, { id: 2 });

    await receive(workflowRunPayload());

    expect(scope.isDone()).toBe(true);
    expect(comment?.body).toContain('_images disabled_');
    expect(comment?.body).toContain('/approve-shots');
    expect(comment?.body).not.toContain('/img/');
  });
});
