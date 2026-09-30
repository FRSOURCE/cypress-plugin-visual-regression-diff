#!/usr/bin/env node
/**
 * Publishes every public workspace package whose version is not on npm yet.
 *
 * Stable mode (CI on `main`, after release-please cut a release) publishes the
 * versions committed in `package.json` under `latest`.
 *
 * Beta mode (`--beta <n>`, the manually dispatched "Beta release" workflow)
 * rewrites every public package's version to `X.Y.Z-beta.<n>` in the working
 * tree, without committing anything, and publishes under `next`. release-please
 * never produces prerelease versions; betas exist only through this flag.
 *
 * The dist-tag is derived from the version, not from configuration, so a
 * stable run can never land on `next` and a beta run can never land on
 * `latest`.
 *
 * Usage (from the repository root, after `pnpm build`):
 *   node scripts/publish.mjs                 # stable versions -> latest
 *   node scripts/publish.mjs --beta 2        # X.Y.Z-beta.2 -> next
 *   node scripts/publish.mjs --dry-run       # only print what would be published
 */

/* global process, console */
/* eslint-disable no-console */

import { execFileSync } from 'child_process';
import { appendFileSync } from 'fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const betaFlag = args.indexOf('--beta');
const beta = betaFlag === -1 ? null : args[betaFlag + 1];

if (betaFlag !== -1 && !/^\d+$/.test(beta ?? '')) {
  console.error(
    `--beta expects a non-negative integer (the N in X.Y.Z-beta.N), got ${JSON.stringify(beta ?? '')}`,
  );
  process.exit(1);
}

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    ...opts,
  });

let packages = JSON.parse(
  run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']),
).filter((pkg) => pkg.name && pkg.version && !pkg.private);

if (beta !== null) {
  const prereleases = packages.filter(({ version }) => version.includes('-'));
  if (prereleases.length) {
    console.error(
      `--beta needs stable versions in package.json, but found: ${prereleases
        .map(({ name, version }) => `${name}@${version}`)
        .join(', ')}`,
    );
    process.exit(1);
  }
  // Rewrite every sibling before publishing anything: `pnpm publish` resolves
  // `workspace:` ranges from the sibling's package.json at publish time.
  packages = packages.map((pkg) => {
    const version = `${pkg.version}-beta.${beta}`;
    console.log(`version ${pkg.name} ${pkg.version} -> ${version}`);
    run('npm', ['pkg', 'set', `version=${version}`], { cwd: pkg.path });
    return { ...pkg, version };
  });
}

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

const published = [];
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
  published.push({ name, version, tag });
}

console.log(
  published.length
    ? `published ${published.length} package(s)`
    : 'nothing to publish',
);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = published.length
    ? published.map(
        ({ name, version, tag }) => `| ${name} | ${version} | ${tag} |`,
      )
    : ['| _nothing to publish_ | | |'];
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `## Published${dryRun ? ' (dry run)' : ''}`,
      '',
      '| Package | Version | dist-tag |',
      '| --- | --- | --- |',
      ...rows,
      '',
    ].join('\n'),
  );
}
