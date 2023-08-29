<p align="center">
  <a href="https://www.npmjs.com/package/@frsource/cypress-plugin-visual-regression-diff">
    <img src="https://img.shields.io/npm/v/@frsource/cypress-plugin-visual-regression-diff.svg" alt="NPM version badge">
  </a>
  <a href="https://www.npmjs.com/package/@frsource/cypress-plugin-visual-regression-diff">
    <img src="https://img.shields.io/npm/dt/@frsource/cypress-plugin-visual-regression-diff.svg" alt="NPM total downloads badge">
  </a>
  <a href="https://codeclimate.com/github/FRSOURCE/cypress-plugin-visual-regression-diff/maintainability">
    <img src="https://api.codeclimate.com/v1/badges/b4f9a6e7b071771dd82f/maintainability.svg" alt="CodeClimate maintainability badge">
  </a>
  <a href="https://codeclimate.com/github/FRSOURCE/cypress-plugin-visual-regression-diff/test_coverage">
    <img src="https://api.codeclimate.com/v1/badges/b4f9a6e7b071771dd82f/test_coverage" />
  </a>
  <a href="https://github.com/semantic-release/semantic-release">
    <img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg" alt="semantic-relase badge">
  </a>
  <a href="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/FRSOURCE/cypress-plugin-visual-regression-diff.svg" alt="license MIT badge">
  </a>
</p>

<p align="center">
  <img src="https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/blob/main/assets/logo.svg" alt="Cypress Plugin Visual Regression Diff logo" height="120px"/>
</p>

<h1 align="center">Plugin for Cypress - Visual Regression Diff</h1>
<p align="center">Perform visual regression test with a nice GUI as help. 💅 <i>Only&nbsp;for&nbsp;Cypress!</i> Both e2e and component-testing compatible 💪</p>

<p align="center">
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="#usage">Usage</a>
  ·
  <a href="#faq">FAQ</a>
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

![frsource-visual-testing-example](https://user-images.githubusercontent.com/10456649/191988386-2be2ea14-7b7a-4048-a14e-0cad8d21e214.gif)

## Getting started

### Installation

You can install this library using your favorite package manager:

```bash
# npm
npm install --save-dev @frsource/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @frsource/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @frsource/cypress-plugin-visual-regression-diff
```

Next, you need to import the library:

- first, in your support file (located by default in `cypress/support/index.js`):

```ts
// typescript / ES6
import "@frsource/cypress-plugin-visual-regression-diff";

// javascript
require("@frsource/cypress-plugin-visual-regression-diff");
```

- secondly:
  - (for Cypress 10.0+) in `cypress.config.js` (or `cypress.config.ts`):

```ts
// typescript / ES6
import { defineConfig } from "cypress";
import { initPlugin } from "@frsource/cypress-plugin-visual-regression-diff/plugins";

export default defineConfig({
  // initPlugin must be called in the section where it is used: e2e or component
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
  component: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});
```

- (for Cypress <10.0) in your plugins file (located by default in `cypress/plugins/index.js`):

```ts
// typescript / ES6
import { initPlugin } from "@frsource/cypress-plugin-visual-regression-diff/plugins";

export default function (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) {
  initPlugin(on, config);

  return config;
}

// javascript
const {
  initPlugin,
} = require("@frsource/cypress-plugin-visual-regression-diff/plugins");

module.exports = function (on, config) {
  initPlugin(on, config);

  return config;
};
```

That's it - now let's see how to use the library in [usage section](#usage).

## Usage

Once installed, the library might be used by writing in your test:

```ts
cy.get(".an-element-of-your-choice").matchImage();
```

Or, if you would like to make a screenshot of whole document:

```ts
cy.matchImage();
```

`matchImage` command will do a screenshot and compare it with image from a previous run. In case of regression the test will fail and you'll get a "See comparison" button to see what's a root of a problem.

## Example

Still got troubles with installation? Have a look at [examples directory of this repo](./examples) to see how this plugin can be used in e2e or component-testing Cypress environment within your project.

## Automatic clean up of unused images

It's useful to remove screenshots generated by the visual regression plugin that are not used by any test anymore.
Enable this feature via env variable and enjoy freed up storage space 🚀:

```bash
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Configuration

Configure the plugin:

- by passing in configuration as an argument to `matchImage` command:

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
  // whether to create missing baseline images automatically
  // default: true
  createMissingImages: false,
  // whether to update images automatically, without making a diff - useful for CI
  // default: false
  updateImages: true,
  // directory path in which screenshot images will be stored
  // relative path are resolved against project root
  // absolute paths (both on unix and windows OS) supported
  // path separators will be normalised by the plugin depending on OS, you should always use / as path separator, e.g.: C:/my-directory/nested for windows-like drive notation
  // There are one special variable available to be used in the path:
  // - {spec_path} - relative path leading from project root to the current spec file directory (e.g. `/src/components/my-tested-component`)
  // default: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maximum threshold above which the test should fail
  // default: 0.01
  maxDiffThreshold: 0.1,
  // forces scale factor to be set as value "1"
  // helps with screenshots being scaled 2x on high-density screens like Mac Retina
  // default: true
  forceDeviceScaleFactor: false,
  // title used for naming the image file
  // default: Cypress.currentTest.titlePath (your test title)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`
  // pass a path to custom image that should be used for comparison
  // instead of checking against the image from previous run
  // default: undefined
  matchAgainstPath: '/path/to/reference-image.png'
})
```

- via [global env configuration](https://docs.cypress.io/guides/guides/environment-variables#Setting). Environment variable names are the same as keys of the configuration object above, but with added `pluginVisualRegression` prefix, e.g.:

```bash
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

```ts
// cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

```json
// cypress.env.json (https://docs.cypress.io/guides/guides/environment-variables#Option-2-cypress-env-json)
{
  "pluginVisualRegressionUpdateImages": true,
  "pluginVisualRegressionDiffConfig": { "threshold": 0.01 }
}
```

For more ways of setting environment variables [take a look here](https://docs.cypress.io/guides/guides/environment-variables#Setting).

## FAQ

<details><summary>Why screenshots doesn't conform to the `viewport` set in my Cypress configuration?</summary>

Screenshots in Cypress do not scale to the viewport size by default. You can change this behavior:

- globally, by changing default screenshot configuration: <code>Cypress.Screenshot.defaults({ capture: 'viewport' });</code>
- locally, by passing screenshot configuration directly to the <code>.matchImage</code> command: <code>cy.matchImage({ screenshotConfig: { capture: 'viewport' } });</code>

</details>

<details><summary>I've upgraded version of this plugin and all on my baseline images has been automatically updated. Why?</summary>

Sometimes we need to do a breaking change in image comparison or image generation algorithms. To provide you with the easiest upgrade path - the plugin updates your baseline images automatically. Just commit them to your repository after the plugin upgrade and you are good to go!

</details>

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
