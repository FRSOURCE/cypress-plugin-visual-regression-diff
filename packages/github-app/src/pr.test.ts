import nock from 'nock';
import { ProbotOctokit, type Context } from 'probot';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { canApprove } from './permissions.js';
import {
  prFromCheckRun,
  prFromIssueComment,
  prFromWorkflowRun,
  toPrInfo,
} from './pr.js';
import {
  API,
  checkRunPayload,
  HEAD_SHA,
  issueCommentPayload,
  pull,
  workflowRunPayload,
} from './test-utils.js';

const octokit = new ProbotOctokit({
  auth: { token: 'x' },
  retry: { enabled: false },
});

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

describe('toPrInfo', () => {
  it('detects forks and deleted head repos', () => {
    expect(toPrInfo(pull())).toMatchObject({
      number: 7,
      headSha: HEAD_SHA,
      headRef: 'feat/x',
      isFork: false,
      canPush: true,
    });
    expect(
      toPrInfo(
        pull({ head: { sha: HEAD_SHA, ref: 'x', repo: { full_name: 'f/r' } } }),
      ),
    ).toMatchObject({ isFork: true, canPush: false });
    expect(
      toPrInfo(pull({ head: { sha: HEAD_SHA, ref: 'x', repo: null } })),
    ).toMatchObject({ headRepo: null, isFork: true });
  });
});

describe('prFromWorkflowRun', () => {
  const payload = (overrides = {}) =>
    workflowRunPayload(
      overrides,
    ) as unknown as Context<'workflow_run.completed'>['payload'];

  it('uses the listed pull request', async () => {
    nock(API).get('/repos/o/r/pulls/7').reply(200, pull());
    expect((await prFromWorkflowRun(octokit, payload()))?.number).toBe(7);
  });

  it('falls back to the commit association, then the head branch', async () => {
    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/pulls`)
      .query(true)
      .reply(200, [pull({ number: 8, state: 'closed' }), pull({ number: 9 })]);
    expect(
      (await prFromWorkflowRun(octokit, payload({ pull_requests: [] })))
        ?.number,
    ).toBe(9);

    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/pulls`)
      .query(true)
      .reply(200, [])
      .get('/repos/o/r/pulls')
      .query({ state: 'open', head: 'fork:feat/x', per_page: '1' })
      .reply(200, [pull({ number: 10 })]);
    expect(
      (
        await prFromWorkflowRun(
          octokit,
          payload({
            pull_requests: [],
            head_repository: { owner: { login: 'fork' } },
          }),
        )
      )?.number,
    ).toBe(10);

    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/pulls`)
      .query(true)
      .reply(200, []);
    expect(
      await prFromWorkflowRun(
        octokit,
        payload({ pull_requests: [], head_repository: null }),
      ),
    ).toBeNull();
  });
});

describe('prFromCheckRun / prFromIssueComment', () => {
  it('resolves from the check run', async () => {
    nock(API).get('/repos/o/r/pulls/7').reply(200, pull());
    expect(
      (
        await prFromCheckRun(
          octokit,
          checkRunPayload(
            '5.1',
            'approve',
          ) as unknown as Context<'check_run.requested_action'>['payload'],
        )
      )?.number,
    ).toBe(7);
    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/pulls`)
      .query(true)
      .reply(200, [pull({ number: 3 })]);
    expect(
      (
        await prFromCheckRun(
          octokit,
          checkRunPayload('5.1', 'approve', {
            pull_requests: [],
          }) as unknown as Context<'check_run.requested_action'>['payload'],
        )
      )?.number,
    ).toBe(3);
  });

  it('resolves from an issue comment on a PR only', async () => {
    nock(API).get('/repos/o/r/pulls/7').reply(200, pull());
    expect(
      (
        await prFromIssueComment(
          octokit,
          issueCommentPayload(
            '/x',
          ) as unknown as Context<'issue_comment.created'>['payload'],
        )
      )?.number,
    ).toBe(7);
    expect(
      await prFromIssueComment(
        octokit,
        issueCommentPayload('/x', {
          issue: { number: 1 },
        }) as unknown as Context<'issue_comment.created'>['payload'],
      ),
    ).toBeNull();
  });
});

describe('canApprove', () => {
  it('requires write access and rejects bots and errors', async () => {
    nock(API)
      .get('/repos/o/r/collaborators/alice/permission')
      .reply(200, { permission: 'write' })
      .get('/repos/o/r/collaborators/bob/permission')
      .reply(200, { permission: 'read', role_name: 'triage' })
      .get('/repos/o/r/collaborators/carol/permission')
      .reply(404, {});
    expect(await canApprove(octokit, 'o', 'r', { login: 'alice' })).toBe(true);
    expect(await canApprove(octokit, 'o', 'r', { login: 'bob' })).toBe(false);
    expect(await canApprove(octokit, 'o', 'r', { login: 'carol' })).toBe(false);
    expect(
      await canApprove(octokit, 'o', 'r', {
        login: 'dependabot[bot]',
        type: 'Bot',
      }),
    ).toBe(false);
  });
});
