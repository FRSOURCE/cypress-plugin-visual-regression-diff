import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  Manifest,
  ManifestEntry,
} from '@frsource/cypress-plugin-visual-regression-diff/plugins';
import { strToU8, zipSync } from 'fflate';
import nock from 'nock';
import { Probot, ProbotOctokit, type ApplicationFunction } from 'probot';
import type { FetchLike } from './artifacts.js';
import { readEnv, type Env } from './env.js';

export const API = 'https://api.github.com';

export const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

export const HEAD_SHA = 'a'.repeat(40);
export const OTHER_SHA = 'b'.repeat(40);

export const tmpDir = () => mkdtemp(path.join(os.tmpdir(), 'cpvrd-app-'));

/** Unwraps an optional value in a test; fails loudly instead of a non-null assertion. */
export const must = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
};

export const testEnv = async (
  overrides: Record<string, string> = {},
): Promise<Env> =>
  readEnv({
    APP_ID: '123',
    PRIVATE_KEY: privateKey,
    WEBHOOK_SECRET: 'test',
    IMAGE_URL_SECRET: 'image-secret',
    PUBLIC_URL: 'https://vr.example.test',
    CACHE_DIR: await tmpDir(),
    ...overrides,
  });

export const createTestProbot = async (app: ApplicationFunction) => {
  const probot = new Probot({
    appId: 123,
    privateKey,
    secret: 'test',
    logLevel: 'fatal',
    Octokit: ProbotOctokit.defaults({ retry: { enabled: false } }),
  });
  await probot.load(app, { cwd: process.cwd(), addHandler: () => undefined });
  return probot;
};

/** A PNG-looking buffer; the app never decodes pixels, only bytes and sizes matter. */
export const png = (label: string) =>
  Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    Buffer.from(label, 'utf8'),
  ]);

export const zipOf = (files: Record<string, Buffer | string>): Buffer =>
  Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([name, content]) => [
          name,
          typeof content === 'string'
            ? strToU8(content)
            : new Uint8Array(content),
        ]),
      ),
    ),
  );

/** A fetch stand-in that serves the given zip for every pre-signed URL. */
export const fetchZip =
  (zip: Buffer, { status = 200, contentLength = true } = {}): FetchLike =>
  async () => {
    const response = new Response(new Uint8Array(zip), {
      status,
      headers: contentLength ? { 'content-length': String(zip.length) } : {},
    });
    return response as unknown as Awaited<ReturnType<FetchLike>>;
  };

export const entry = (
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry => ({
  name: 'home_#0',
  test: {
    file: 'cypress/e2e/home.cy.ts',
    titlePath: ['home', 'renders'],
    retry: 0,
  },
  status: 'failed',
  comparison: { diffRatio: 0.12, threshold: 0.01 },
  images: {
    baseline: {
      path: 'cypress/e2e/__image_snapshots__/home_#0.png',
      width: 10,
      height: 10,
    },
    actual: {
      path: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      width: 10,
      height: 10,
    },
    diff: { path: 'cypress/e2e/__image_snapshots__/home_#0.diff.png' },
  },
  baselineWritten: false,
  recordedAt: '2026-09-22T10:00:00.000Z',
  platform: {
    os: 'linux',
    arch: 'x64',
    browser: { name: 'electron', version: '130' },
  },
  viewport: { width: 1000, height: 660 },
  message:
    'Image diff factor (12%) is bigger than maximum threshold option 1%.',
  ...overrides,
});

export const manifest = (
  entries: ManifestEntry[] = [entry()],
  overrides: Partial<Manifest> = {},
): Manifest => ({
  version: 1,
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:03:00.000Z',
  projectRoot: '/home/runner/work/r/r',
  platform: { os: 'linux', arch: 'x64' },
  ci: {
    provider: 'github',
    repository: 'o/r',
    sha: 'c'.repeat(40),
    ref: 'refs/pull/7/merge',
    pullRequest: {
      number: 7,
      headSha: HEAD_SHA,
      headRef: 'feat/x',
      baseRef: 'main',
    },
    runId: '555',
    runAttempt: '1',
    workspace: '/home/runner/work/r/r',
  },
  options: {},
  runner: {
    name: 'cypress',
    version: '16.1.0',
    testingType: 'e2e',
    browser: { name: 'electron', version: '130' },
  },
  entries,
  ...overrides,
});

export const MANIFEST_ZIP_PATH =
  'cypress/screenshots/cp-visual-regression-diff-manifest.e2e.json';

/** Artifact zip with one failed screenshot and its three images. */
export const failingArtifactZip = (m: Manifest = manifest()) =>
  zipOf({
    [MANIFEST_ZIP_PATH]: JSON.stringify(m),
    'cypress/e2e/__image_snapshots__/home_#0.png': png('baseline'),
    'cypress/e2e/__image_snapshots__/home_#0.actual.png': png('actual'),
    'cypress/e2e/__image_snapshots__/home_#0.diff.png': png('diff'),
  });

export const repository = {
  id: 1,
  name: 'r',
  full_name: 'o/r',
  html_url: 'https://github.com/o/r',
  owner: { login: 'o', id: 10, type: 'Organization' },
};

export const pull = (overrides: Record<string, unknown> = {}) => ({
  number: 7,
  state: 'open',
  head: { sha: HEAD_SHA, ref: 'feat/x', repo: { full_name: 'o/r' } },
  base: { ref: 'main', repo: { full_name: 'o/r' } },
  ...overrides,
});

export const artifactListing = (overrides: Record<string, unknown> = {}) => ({
  total_count: 1,
  artifacts: [
    {
      id: 9,
      name: 'test',
      size_in_bytes: 1234,
      expired: false,
      expires_at: '2027-01-01T00:00:00Z',
      ...overrides,
    },
  ],
});

/** The GitHub calls every handler makes before doing anything interesting. */
export const github = () => nock(API);

export const mockAuth = (scope: nock.Scope) =>
  scope.post('/app/installations/1/access_tokens').reply(201, {
    token: 'ghs_test',
    permissions: {},
    expires_at: '2100-01-01T00:00:00Z',
  });

export const mockNoConfig = (scope: nock.Scope) =>
  scope
    .get(/\/repos\/o\/r\/contents\/.*visual-regression\.yml/)
    .reply(404, { message: 'Not Found' })
    .get(/\/repos\/o\/\.github\/contents\/.*visual-regression\.yml/)
    .reply(404, { message: 'Not Found' });

export const mockArtifact = (scope: nock.Scope, listing = artifactListing()) =>
  scope
    .get('/repos/o/r/actions/runs/555/artifacts')
    .query(true)
    .reply(200, listing)
    .get('/repos/o/r/actions/artifacts/9/zip')
    .reply(302, '', { location: 'https://blob.example.test/9.zip' });

export const workflowRunPayload = (
  overrides: Record<string, unknown> = {},
) => ({
  action: 'completed',
  workflow_run: {
    id: 555,
    run_attempt: 1,
    event: 'pull_request',
    conclusion: 'failure',
    head_sha: HEAD_SHA,
    head_branch: 'feat/x',
    head_repository: { owner: { login: 'o' } },
    pull_requests: [{ number: 7 }],
    html_url: 'https://github.com/o/r/actions/runs/555',
    ...overrides,
  },
  repository,
  installation: { id: 1 },
  sender: { login: 'alice', id: 1, type: 'User' },
});

export const checkRunPayload = (
  externalId: string,
  identifier: string,
  overrides: Record<string, unknown> = {},
) => ({
  action: 'requested_action',
  check_run: {
    id: 77,
    external_id: externalId,
    head_sha: HEAD_SHA,
    pull_requests: [{ number: 7 }],
    ...overrides,
  },
  requested_action: { identifier },
  repository,
  installation: { id: 1 },
  sender: { login: 'alice', id: 1, type: 'User' },
});

export const issueCommentPayload = (
  body: string,
  overrides: Record<string, unknown> = {},
) => ({
  action: 'created',
  issue: { number: 7, pull_request: { url: `${API}/repos/o/r/pulls/7` } },
  comment: {
    id: 900,
    body,
    user: { login: 'alice', id: 1, type: 'User' },
  },
  repository,
  installation: { id: 1 },
  sender: { login: 'alice', id: 1, type: 'User' },
  ...overrides,
});
