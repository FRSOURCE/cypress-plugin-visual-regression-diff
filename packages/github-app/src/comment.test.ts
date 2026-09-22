import nock from 'nock';
import { ProbotOctokit } from 'probot';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { findComment, react, reply, upsertComment } from './comment.js';
import { API } from './test-utils.js';

const octokit = new ProbotOctokit({
  auth: { token: 'x' },
  retry: { enabled: false },
});
const repo = { owner: 'o', repo: 'r' };

beforeAll(() => nock.disableNetConnect());
afterEach(() => nock.cleanAll());

describe('comments', () => {
  it('creates the report comment when none carries the marker', async () => {
    nock(API)
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [{ id: 1, body: 'unrelated' }])
      .post('/repos/o/r/issues/7/comments', { body: '<!-- m --> hello' })
      .reply(201, { id: 2 });
    expect(
      await upsertComment(octokit, repo, 7, '<!-- m -->', '<!-- m --> hello'),
    ).toEqual({ id: 2, created: true });
  });

  it('edits the existing report comment', async () => {
    nock(API)
      .get('/repos/o/r/issues/7/comments')
      .query(true)
      .reply(200, [
        { id: 1, body: 'x' },
        { id: 5, body: 'old <!-- m --> text' },
      ])
      .patch('/repos/o/r/issues/comments/5', { body: 'new' })
      .reply(200, { id: 5 });
    expect(await upsertComment(octokit, repo, 7, '<!-- m -->', 'new')).toEqual({
      id: 5,
      created: false,
    });
    nock(API).get('/repos/o/r/issues/7/comments').query(true).reply(200, []);
    expect(await findComment(octokit, repo, 7, '<!-- m -->')).toBeNull();
  });

  it('reacts and replies', async () => {
    nock(API)
      .post('/repos/o/r/issues/comments/9/reactions', { content: 'eyes' })
      .reply(201, {})
      .post('/repos/o/r/issues/7/comments', { body: 'hi' })
      .reply(201, { id: 3 });
    await react(octokit, repo, 9, 'eyes');
    await reply(octokit, repo, 7, 'hi');
    expect(nock.isDone()).toBe(true);
  });
});
