<p align="center">
  <a href="https://www.npmjs.com/package/@frsource/cypress-plugin-visual-regression-diff">
    <img src="https://img.shields.io/npm/v/@frsource/cypress-plugin-visual-regression-diff" alt="NPM version badge">
  </a>
  <a href="https://github.com/semantic-release/semantic-release">
    <img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg" alt="semantic-relase badge">
  </a>
  <a href="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/FRSOURCE/cypress-plugin-visual-regression-diff" alt="license MIT badge">
  </a>
</p>

<p align="center">
  <img src="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/main/src/assets/logo.svg" alt="Cypress Plugin Visual Regression Diff logo" height="120px"/>
</p>

<h1 align="center">Plugin for Cypress - Visual Regression Diff</h1>
<p align="center">Perform visual regression test with a nice GUI as help. 💅 <i>Only&nbsp;for&nbsp;Cypress!</i></p>

<p align="center">
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="#usage">Usage</a>
  ·
  <a href="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues">File an Issue</a>
  ·
  <a href="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions">Have a question or an idea?</a>
  <br>
</p>

<p align="center">
  <br>
  <i>Plugin for visual regression testing that provides smooth experience:
    <br>Specify threshold below which the test will fail.
    <br>Quickly preview old &amp; new screenshot directly in the Cypress UI.
    <br>Find visual changes using images diff.
    <br>Published as treeshakeable bundles, separate for JS ES5 or modern bundlers thanks to <a href="https://www.npmjs.com/package/microbundle">microbundle</a>.
    <br>Working with every bundler (tested on webpack, vite, rollup),
    <br>Provides proper typings as is written completely in <a href="https://www.typescriptlang.org">typescript</a>.</i>
  <br>
  <br>
</p>

https://user-images.githubusercontent.com/10456649/148709744-a23bc072-590a-4997-8ab8-252dc1b21791.mp4

## Getting started

### Installation

You can install this library using your favorite package manager:

```bash
# yarn
yarn add -D @frsource/cypress-plugin-visual-regression-diff

# npm
npm install --save-dev @frsource/cypress-plugin-visual-regression-diff
```

Next, you need to import the library:

- first, in your support file (located by default in `cypress/support/index.js`):
```ts
// typescript
import '@frsource/cypress-plugin-visual-regression-diff/dist/support';

// javascript
require('@frsource/cypress-plugin-visual-regression-diff/dist/support');
```

- secondly, in your plugins file (located by default in `cypress/plugins/index.js`):
```ts
// typescript
import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/dist/plugins';

export default function (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  initPlugin(on, config);

  return config;
};

// javascript
const { initPlugin } = require('@frsource/cypress-plugin-visual-regression-diff/dist/plugins');

module.exports = function (on, config) {
  initPlugin(on, config);

  return config;
}
```

That's it - now let's see how to use the library in [usage section](#usage).

## Usage

Once installed, the library might be used by writing in your test:

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

Or, if you would like to make a screenshot of whole document:

```ts
cy.matchImage();
```

`matchImage` command will do a screenshot and compare it with image from a previous run. In case of regression the test will fail and you'll get a "Compare images" button to see what's a root of a problem.

## Configuration

This plugin can be configured either:

- directly, on a matcher level - by passing in plugin options as an argument to `matchImage` command, e.g.:

```ts
cy.matchImage({
  // screenshot configuration, passed directly to the the Cypress screenshot method: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // default: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted']
  },
  // pixelmatch options, see: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // default: { includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // whether to update images automatically, without making a diff - useful for CI
  // default: false
  updateImages: true,
  // directory path in which screenshot images will be stored
  // image visualiser will normalise path separators depending on OS it's being run within, so always use / for nested paths
  // default: '__image_snapshots__'
  imagesDir: 'this-might-be-your-custom/maybe-nested-directory',
  // maximum threshold above which the test should fail
  // default: 0.01
  maxDiffThreshold: 0.1
})
```

- via [global env configuration](https://docs.cypress.io/guides/guides/environment-variables#Setting). All of the environment variable names are the same as keys of the configuration options passed to `matchImage` method, but with added `pluginVisualRegression` prefix, e.g.:

```bash
npx cypress run --env "pluginVisualRegressionUpdateImages=true" --env 'pluginVisualRegressionDiffConfig={"threshold":0.01}'
```

```json
// cypress.json
{
  "env": {
    "pluginVisualRegressionUpdateImages": true,
    "pluginVisualRegressionDiffConfig": { "threshold": 0.01 }
  }
}
```

```json
// cypress.env.json (https://docs.cypress.io/guides/guides/environment-variables#Option-2-cypress-env-json)
{
  "pluginVisualRegressionUpdateImages": true,
  "pluginVisualRegressionDiffConfig": { "threshold": 0.01 }
}
```

For more ways of setting environment variables [take a look here](https://docs.cypress.io/guides/guides/environment-variables#Setting).

## Questions

Don’t hesitate to ask a question directly on the [discussions board](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions)!

## Changelog

Changes for every release are documented in the [release notes](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/releases) and [CHANGELOG files of every package](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/tree/main/packages).

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2021-present, Jakub FRS Freisler, [FRSOURCE](https://www.frsource.org/)

<p align="center">
<a href="https://www.frsource.org/" title="Click to visit FRSOURCE page!">
<img src="https://www.frsource.org/logo.jpg" alt="FRSOURCE logo" height="60px"/>
</a>
</p>
