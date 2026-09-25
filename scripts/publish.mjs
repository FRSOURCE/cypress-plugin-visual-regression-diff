#!/usr/bin/env node
/**
 * Publishes every public workspace package whose version is not on npm yet.
 *
 * The dist-tag comes from the version, not from configuration: a prerelease
 * version (`5.0.0-beta.1`) goes to `next`, a stable one to `latest`. This is
 * what lets release-please's `"versioning": "prerelease"` produce betas that
 * users install with `@next` without the beta ever becoming the default
 * install.
 *
 * Usage (from the repository root, after `pnpm build`):
 *   node scripts/publish.mjs            # publish
 *   node scripts/publish.mjs --dry-run  # only print what would be published
 */

/* global process, console */
/* eslint-disable no-console */

import { execFileSync } from 'child_process';

const dryRun = process.argv.includes('--dry-run');

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

const packages = JSON.parse(
  run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']),
).filter((pkg) => pkg.name && pkg.version && !pkg.private);

const isPublished = (name, version) => {
  try {
    const args = ['view', `${name}@${version}`, 'version'];
    return (
      run('npm', args, { stdio: ['ignore', 'pipe', 'ignore'] }).trim() ===
      version
    );
  } catch {
    // `npm view` exits non-zero when the package or the version does not exist.
    return false;
  }
};

const distTag = (version) => (version.includes('-') ? 'next' : 'latest');

let published = 0;
for (const { name, version, path } of packages) {
  const spec = `${name}@${version}`;
  if (isPublished(name, version)) {
    console.log(`skip    ${spec} (already on npm)`);
    continue;
  }
  const tag = distTag(version);
  const args = [
    'publish',
    '--tag',
    tag,
    '--no-git-checks',
    ...(dryRun ? ['--dry-run'] : []),
  ];
  console.log(`publish ${spec} --tag ${tag}${dryRun ? ' (dry run)' : ''}`);
  run('pnpm', args, { cwd: path, stdio: 'inherit' });
  published += 1;
}

console.log(
  published ? `published ${published} package(s)` : 'nothing to publish',
);
