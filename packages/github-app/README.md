# Visual regression GitHub App

A small [Probot](https://probot.github.io/) app that turns the [run manifest](../visual-regression-manifest/README.md) written by `@frsource/cypress-plugin-visual-regression-diff` (4.3 and later, see [its README](../cypress-plugin-visual-regression-diff/README.md#run-manifest-ci-integration)) into a pull request review flow:

- when a workflow run finishes, it downloads the artifact with the manifest and the PNGs, and posts a **check run** (failure when any screenshot needs a look) plus **one comment** on the PR with old / diff / new thumbnails;
- a reviewer approves a screenshot with the **Approve** button on its check run, all of them with **Approve all**, or by commenting `/approve-visuals` (optionally followed by names);
- approving copies the run's `.actual.png` bytes over the baseline file and pushes **one commit** to the PR branch. Nothing is re-rendered; the image the reviewer saw is the image that lands in git.

The app is runner-agnostic: it reads the manifest through [`@frsource/visual-regression-manifest`](../visual-regression-manifest/README.md) and knows nothing about Cypress, so anything that writes that format works with it unchanged: the Playwright sibling once it ships, Playwright's own `toHaveScreenshot` output through the package's `fromPlaywrightReport` converter, and any tool that leaves baseline / actual / diff images behind through `fromImageTriples`. That last converter is also the bridge for plugin versions before 4.3, which write no manifest: a small script in the workflow can turn the `__image_snapshots__` directories into a manifest and upload it with the artifact.

## Using it in your repository

1. Install the app on the repository (the maintainer's instance, or [your own](#running-your-own-instance)).
2. Make your workflow upload the manifest and the snapshot directories, also when Cypress fails:

   ```yaml
   - run: npx cypress run
   - uses: actions/upload-artifact@v4
     if: always()
     with:
       name: visual-regression
       path: |
         cypress/screenshots/visual-regression-manifest.*.json
         cypress/**/__image_snapshots__/**
   ```

   Keep `pluginVisualRegressionUpdateImages` off in that job; the app needs the `.actual.png` and `.diff.png` files the plugin leaves behind for failed comparisons.

3. Optionally add `.github/visual-regression.yml` (read from the default branch):

   ```yaml
   artifacts: ['visual-regression'] # artifact name globs, default ['**']
   manifestGlob: '**/*visual-regression-manifest*.json' # picomatch, matched against paths inside the artifact zip
   projectRoot: '' # Cypress project dir inside the repo, for manifests without ci.workspace (monorepos)
   commentCommand: approve-visuals # /approve-visuals [names…]; /regenerate-visuals is always accepted too
   perImageChecks: 10 # check runs with an "Approve" button per failed screenshot, 0 disables
   images: true # false: text-only report, no screenshots are served by the app
   imageTtlDays: 14 # lifetime of image links (the server caps it)
   maxCommentEntries: 20 # thumbnails before the rest is collapsed
   checkName: Visual regression
   commitMessage: 'test: approve visual baselines ({count} images)' # {count} {names} {user} {run}
   ```

### Approving

- Buttons: the summary check run `Visual regression` has **Approve all** and **Refresh report**; each failed screenshot (up to `perImageChecks`) has its own `Visual regression: <name>` check run with **Approve**.
- Comments: `/approve-visuals` approves everything that needs a look, `` /approve-visuals `home page renders_#0` `` approves the named ones (backticks or quotes keep spaces together; when several platforms share a name, use `` `name (linux / chrome)` ``; a screenshot rendered by something other than the test browser carries that renderer too, e.g. `` `name (linux / electron (docker chromium))` ``).
- The manifest's `renderer` block is honoured: entries of the same screenshot rendered by different renderers are reported and approved separately, and a run in which the plugin fell back to the local browser (`renderer.fallback: true`) gets a note in the report, because those pixels will drift against baselines made with the pinned renderer.
- Only users with write access can approve. The app reacts with 👀 when it starts, 🚀 when it committed, 😕 when it could not, and replies with the reason.
- The report belongs to a commit. Once the branch moves on, the app refuses to approve from the old report and waits for the new run.
- Pull requests from forks get the report, but the app cannot push to a fork; the comment says so.

### Privacy

Thumbnails are served by the app from the downloaded artifact through unguessable, expiring links (`/img/<signed token>`). GitHub fetches them through its image proxy, so the app never sees who views the PR. Anyone holding a link can open the image until it expires. If your screenshots contain sensitive data, set `images: false` for a text-only report, or run your own instance.

## Running your own instance

### Environment

| variable                  | meaning                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `APP_ID`, `PRIVATE_KEY`   | GitHub App credentials (`PRIVATE_KEY` as PEM or base64 of the PEM) |
| `WEBHOOK_SECRET`          | webhook secret configured on the app                               |
| `IMAGE_URL_SECRET`        | signs image links, e.g. `openssl rand -hex 32`                     |
| `PUBLIC_URL`              | public origin of this server, used in image links                  |
| `PORT`, `HOST`            | listen address, default `3100` / `0.0.0.0`                         |
| `CACHE_DIR`               | where extracted artifacts live; put it on a volume                 |
| `CACHE_TTL_HOURS`         | how long extracted artifacts are kept, default 168                 |
| `CACHE_MAX_BYTES`         | cache size cap, default 5 GiB (oldest artifacts go first)          |
| `IMAGE_URL_TTL_HOURS`     | upper bound for image link lifetime, default 336                   |
| `MAX_ARTIFACT_BYTES`      | per-run download budget, default 2 GiB                             |
| `MAX_FILE_BYTES`          | largest file extracted from an artifact, default 50 MiB            |
| `WEBHOOK_PROXY_URL`       | a [smee.io](https://smee.io) channel for local development         |
| `LOG_LEVEL`, `LOG_FORMAT` | Probot logging, `info` / `json` in production                      |

### Register the app

Create the app by hand (GitHub → Settings → Developer settings → GitHub Apps → New GitHub App) with the permissions and events from [`app.yml`](./app.yml) and the webhook URL `https://<APP_HOST>/api/github/webhooks`, generate a private key and a webhook secret, and put `APP_ID`, `PRIVATE_KEY` and `WEBHOOK_SECRET` into the environment. The server does not offer Probot's `/probot` registration page: it builds its own `Server` and refuses to start without those three (`appId option is required`).

### Local development

```bash
pnpm install
pnpm --filter @frsource/visual-regression-manifest build   # the app imports the package through its dist
cp packages/github-app/.env.example packages/github-app/.env           # fill in APP_ID, PRIVATE_KEY, WEBHOOK_SECRET, WEBHOOK_PROXY_URL
pnpm --filter @frsource/cpvrd-github-app dev
```

Webhooks arrive through the smee channel; image links only work when `PUBLIC_URL` is reachable from GitHub (a tunnel), otherwise set `images: false` in the test repository's config.

```bash
pnpm --filter @frsource/cpvrd-github-app test:integration
```

### Deploying

The image is a plain Node server, so any container host works. This repository deploys to the maintainer's VPS with `.github/workflows/deploy-github-app.yml`: the image is built on the runner and pushed to `ghcr.io/frsource/cpvrd-github-app`, then `docker compose … up -d` runs on the server over an SSH docker context. The container joins the external `nginx-proxy` network, which terminates TLS. Required repository secrets: `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, `IMAGE_URL_SECRET`, `FRSCHOOL_SSH_HOST`, `FRSCHOOL_SSH_PRIVATE_KEY`; variables: `APP_HOST` (and optionally `PORT`). Point the `APP_HOST` DNS record at the server before the first deploy so the certificate can be issued.

```bash
# from packages/github-app, local build
docker compose build && docker compose up
```

### Why a server at all?

GitHub has no API for apps to upload images, `data:` URIs are stripped from markdown, and check-run images need a URL. Committing images somewhere would pollute repositories and still need auth for private ones. Serving them from the artifact cache behind signed links keeps everything inside the installation's own data, and swapping the disk cache for S3/R2 pre-signed URLs later is a one-module change.

## How it works

1. `workflow_run.completed` (for `pull_request`, `pull_request_target` and `push` runs): resolve the PR, read the config, list artifacts matching `artifacts`, stream each zip to disk (size-capped, zip-slip guarded), keep the PNGs and JSON files, parse every file matching `manifestGlob` (`parseManifestJson` from the manifest package validates it against the schema), merge the entries with the package's `mergeManifests` (several machines, e2e + component; a later run attempt wins), then upsert the summary check, the per-image checks and the comment. Check runs are found by `external_id` (`<runId>.<attempt>[.<key>]`), so a redelivered webhook updates rather than duplicates.
2. `check_run.requested_action`: permission check, then `approve()`: read the branch head (it must still be the report's commit), create one blob per approved image, one tree, one commit, and update the ref without force. Files whose baseline already has the same bytes are skipped, so a second click is a no-op. A non-fast-forward is retried once.
3. `issue_comment.created`: parse the command, find the report comment by its hidden marker to learn the run id and commit, then the same approval path.
