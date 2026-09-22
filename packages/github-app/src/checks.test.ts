import nock from 'nock';
import { ProbotOctokit } from 'probot';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  ACTION_APPROVE_ALL,
  externalId,
  listOwnChecks,
  parseExternalId,
  perImageCheckName,
  upsertCheck,
} from './checks.js';
import { API, HEAD_SHA } from './test-utils.js';

const octokit = new ProbotOctokit({
  auth: { token: 'x' },
  retry: { enabled: false },
});

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

describe('externalId', () => {
  it('round-trips with and without a key hash', () => {
    expect(externalId({ runId: 5, attempt: 2 })).toBe('5.2');
    expect(parseExternalId('5.2')).toEqual({
      runId: 5,
      attempt: 2,
      keyHash: undefined,
    });
    expect(parseExternalId('5.2.abcdef012345')).toEqual({
      runId: 5,
      attempt: 2,
      keyHash: 'abcdef012345',
    });
    expect(parseExternalId('garbage')).toBeNull();
    expect(parseExternalId(null)).toBeNull();
  });

  it('keeps action fields inside GitHub limits and clips long names', () => {
    expect(ACTION_APPROVE_ALL.label.length).toBeLessThanOrEqual(20);
    expect(ACTION_APPROVE_ALL.description.length).toBeLessThanOrEqual(40);
    expect(
      perImageCheckName('Visual regression', 'x'.repeat(300)),
    ).toHaveLength(255);
  });
});

describe('upsertCheck', () => {
  it('creates a check run when none has our external id', async () => {
    let created: Record<string, unknown> | undefined;
    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .reply(200, {
        total_count: 1,
        check_runs: [{ id: 1, external_id: 'other' }],
      })
      .post('/repos/o/r/check-runs', (body) => {
        created = body;
        return true;
      })
      .reply(201, { id: 2 });

    const id = await upsertCheck(
      octokit,
      { owner: 'o', repo: 'r' },
      {
        headSha: HEAD_SHA,
        name: 'Visual regression',
        externalId: '5.1',
        output: { title: 't', summary: 's' },
        conclusion: 'failure',
        actions: [ACTION_APPROVE_ALL],
        detailsUrl: 'https://x',
      },
    );
    expect(id).toBe(2);
    expect(created).toMatchObject({
      head_sha: HEAD_SHA,
      external_id: '5.1',
      status: 'completed',
      conclusion: 'failure',
      details_url: 'https://x',
      actions: [ACTION_APPROVE_ALL],
    });
  });

  it('updates the existing check run instead', async () => {
    let updated: Record<string, unknown> | undefined;
    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .reply(200, {
        total_count: 1,
        check_runs: [{ id: 3, external_id: '5.1' }],
      })
      .patch('/repos/o/r/check-runs/3', (body) => {
        updated = body;
        return true;
      })
      .reply(200, { id: 3 });

    const id = await upsertCheck(
      octokit,
      { owner: 'o', repo: 'r' },
      {
        headSha: HEAD_SHA,
        name: 'Visual regression',
        externalId: '5.1',
        output: { title: 'x'.repeat(300), summary: 's' },
        status: 'in_progress',
      },
    );
    expect(id).toBe(3);
    expect(updated).not.toHaveProperty('conclusion');
    expect((updated?.output as { title: string }).title).toHaveLength(255);
  });
});

describe('listOwnChecks', () => {
  it('returns the summary and per-image checks of a run', async () => {
    nock(API)
      .get(`/repos/o/r/commits/${HEAD_SHA}/check-runs`)
      .query(true)
      .reply(200, {
        total_count: 3,
        check_runs: [
          { id: 1, external_id: '5.1' },
          { id: 2, external_id: '5.1.abcdef012345' },
          { id: 3, external_id: '5.10' },
        ],
      });
    const mine = await listOwnChecks(
      octokit,
      { owner: 'o', repo: 'r' },
      HEAD_SHA,
      { runId: 5, attempt: 1 },
    );
    expect(mine.map((c) => c.id)).toEqual([1, 2]);
  });
});
