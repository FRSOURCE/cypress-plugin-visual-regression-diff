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

- Read through the [development setup](#development-setup) to learn how to work with this project. Always make sure that `yarn lint`, `yarn build` and `yarn test` pass

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
You will need [Node.js](https://nodejs.org/en/) **version 16+** and [yarn](https://yarnpkg.com/getting-started/install).
<!-- textlint-enable -->

After cloning the repository, run:

``` bash
yarn i # installs the project dependencies
cd example && yarn i # install dependencies for example project (useful for testing)
```

### Committing Changes

Commit messages should follow the [conventional commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) so that changelogs can be automatically generated. Commit messages will be automatically validated upon commit.

### These npm scripts are available in the repo

When fired in the project root they will run corresponding actions in every nested package at once.

``` bash
# build the project for NPM and example usage
$ yarn build

# run tests once
$ yarn test

# open cypress component runner from example directory
# requires plugin to be built first via `yarn build`
$ yarn test:ct

# open cypress e2e runner from example directory
# requires plugin to be built first via `yarn build`
$ yarn test:e2e

# run tests and collect coverage
$ yarn test:integration:coverage

# lint & try to autofix linting errors
$ yarn fix:lint && yarn prettify

# lint files
$ yarn lint && yarn prettify:ci
```

There are some other scripts available in the `scripts` section of the `package.json` file.

## Credits

Many thanks to all the people who have already contributed to @frsource/cypress-plugin-visual-regression-diff! ❤️
