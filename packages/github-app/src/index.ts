import type { ApplicationFunction } from 'probot';
import type { FetchLike } from './artifacts.js';
import { readEnv, type Env } from './env.js';
import { handleCheckRun } from './handlers/check-run.js';
import { handleIssueComment } from './handlers/issue-comment.js';
import { handleWorkflowRun } from './handlers/workflow-run.js';
import { createImageHandler, healthHandler } from './images.js';
import { resolveImage } from './run.js';

export type AppDeps = {
  env: Env;
  /** Overridable for tests; downloads the pre-signed artifact URL. */
  fetchImpl?: FetchLike;
};

export const createApp =
  ({ env, fetchImpl }: AppDeps): ApplicationFunction =>
  (app, options) => {
    const deps = { fetchImpl };
    app.on('workflow_run.completed', (context) =>
      handleWorkflowRun(context, env, deps),
    );
    app.on('check_run.requested_action', (context) =>
      handleCheckRun(context, env, deps),
    );
    app.on('issue_comment.created', (context) =>
      handleIssueComment(context, env, deps),
    );

    options.addHandler?.(healthHandler);
    options.addHandler?.(
      createImageHandler({
        secret: env.imageUrlSecret,
        resolve: async (ref) =>
          resolveImage(await app.auth(ref.i), ref, env, deps),
      }),
    );
  };

export default createApp({ env: readEnv() });
