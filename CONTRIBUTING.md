# @frsource/cypress-plugin-visual-regression-diff Contributing Guide

Hey! It’s really exciting for us to see your interest in contributing to this library. Before taking off with your work, please take a moment to read through these guidelines:

- [Code of Conduct](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/master/CODE_OF_CONDUCT.md)
- [Questions?](#questions)
- [Reporting an issue or a feature request](#reporing-an-issue-or-a-feature-request)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)

## Questions?

Don’t hesitate to ask a question directly on the [discussions board](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions)!

## Reporting an issue or a feature request

- Please always use GitHub Issues tracker with [appropriate template](https://github.com/login?return_to=https%3A%2F%2Fgithub.com%2FFRSOURCE%2Fcypress-plugin-visual-regression-diff%2Fissues%2Fnew%2Fchoose) to create a new issue or suggestion

## Pull Request Guidelines

- Check if there isn’t a similar PR already in the [GitHub Pull requests](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/pulls) - maybe somebody already has covered this topic?

- Checkout the master branch and (after you do your work) file a PR against it

- Read through the [development setup](#development-setup) to learn how to work with this project. Always make sure that `pnpm lint`, `pnpm build` and `pnpm test` pass

- Please use [conventional commits v1.0.0 style guide](https://www.conventionalcommits.org/en/v1.0.0/) for commits and PR names

- We have no preference about number of commits on the PR - they will be all squashed by GitHub while merging

- When creating a new feature/plugin/integration:

  - Make sure the feature is covered by tests
  - Provide a meaningful description. In most cases it would make sens to first open a issue with a suggestion, discuss about it and have it approved before working on it

- When fixing bug:
  - Try to cover the scenario with tests if possible
  - If an issue for this bug already exists, please reference it via (`Refs: #XYZ` - where `XYZ` is an issue number) at the very bottom of your commit message and PR description as proposed by [conventional commits v1.0.0 style guide](https://www.conventionalcommits.org/en/v1.0.0/#commit-message-with-multi-paragraph-body-and-multiple-footers)
  - If there is no issue connected with the bug, please provide a detailed description of the problem in the PR. Live demo preferred ([look for the codeine example project in the bug issue template](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/master/.github/ISSUE_TEMPLATE/bug_report.md))

## Development Setup

<!-- textlint-disable spelling -->

You will need [Node.js](https://nodejs.org/en/) **version 16+** and [pnpm](https://pnpm.io/installation).

<!-- textlint-enable -->

After cloning the repository, run:

```bash
pnpm i # installs the project dependencies
```

### Committing Changes

Commit messages should follow the [conventional commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) so that changelogs can be automatically generated. Commit messages will be automatically validated upon commit.

### These npm scripts are available in the repo

When fired in the project root they will run corresponding actions in every nested package at once.

```bash
# build the project for NPM and example usage
$ pnpm build

# run tests once
$ pnpm test

# open cypress component runner from example directory
# requires plugin to be built first via `pnpm build`
$ pnpm test:ct

# open cypress e2e runner from example directory
# requires plugin to be built first via `pnpm build`
$ pnpm test:e2e

# run integration tests once and collect coverage
$ pnpm test:integration:coverage

# run integration tests in watch mode
$ pnpm test:integration:watch

# lint & try to autofix linting errors
$ pnpm fix:lint && pnpm format

# lint files
$ pnpm lint && pnpm format:ci
```

There are some other scripts available in the `scripts` section of the `package.json` file.

### Releases and pre-releases

Releases are cut by [release-please](https://github.com/googleapis/release-please) from conventional commits on `main`: it opens a release PR per package, and merging that PR tags, publishes to npm and creates the GitHub release. `scripts/publish.mjs` picks the npm dist-tag from the version: a prerelease version such as `5.0.0-beta.1` is published under `next`, everything else under `latest`. Install a pre-release with `pnpm add -D @frsource/cypress-plugin-visual-regression-diff@next`.

Release a package before the packages that depend on it. The plugin depends on `@frsource/visual-regression-manifest` as `workspace:*`, which `pnpm publish` rewrites to the exact version the manifest package has in the repository at that moment (`"@frsource/visual-regression-manifest": "1.0.0-beta.1"`). Two consequences:

- A plugin release PR merged while the manifest package still carries the `0.0.0` placeholder (or a version that is not on npm yet) publishes a plugin that cannot be installed. Merge the manifest package's release PR first, wait for its publish, then merge the plugin's. Do not let both land in one combined release PR: `scripts/publish.mjs` publishes in `pnpm -r ls` order, which is alphabetical by directory, so the plugin would go out before the manifest package it pins (`"separate-pull-requests": true` in `release-please-config.json` keeps the PRs apart).
- The pin is exact, so a new manifest package version reaches plugin users only through a plugin release that follows it.

To put a package into a beta cycle, edit its entry in `release-please-config.json`:

```jsonc
"packages/<package>": {
  "versioning": "prerelease", // 5.0.0-beta.1 -> 5.0.0-beta.2 on every release
  "prerelease": true, // GitHub releases are marked as pre-releases
  "release-as": "5.0.0-beta.1" // first beta only; remove after that release PR is merged
}
```

`release-as` is needed once because release-please's first prerelease bump would otherwise produce `5.0.0-beta` (no number) and a brand-new package would start at `1.0.0`. Remove it after the first beta release PR merges; subsequent releases bump the beta number on their own.

To graduate, set `"release-as": "5.0.0"` (the default strategy keeps the `-beta.N` suffix, so the target version has to be explicit), remove `versioning` and `prerelease`, merge the resulting release PR, then remove `release-as` again.

## Credits

Many thanks to all the people who have already contributed to @frsource/cypress-plugin-visual-regression-diff! ❤️
