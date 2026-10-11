---
title: Cypress plugin
description: Visual regression testing for Cypress with a diff viewer in the runner. Works with e2e and component testing.
---

## Why this plugin

- Set a threshold below which the test fails.
- Preview the old and the new screenshot right in the Cypress UI, and find visual changes with an image diff.
- Works with every bundler (tested on webpack, vite and rollup) and with both e2e and component testing.
- Published as treeshakeable bundles, and fully typed because it is written in TypeScript.

## Getting started

You can install this library using your favorite package manager:

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

Next, you need to import the library:

- first, in your support file (located by default in `cypress/support/index.js`):

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- secondly:
  - (for Cypress 10.0+) in `cypress.config.js` (or `cypress.config.ts`):

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin must be called in the section where it is used: e2e or component
  e2e: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
  component: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
});
```

- (for Cypress <10.0) in your plugins file (located by default in `cypress/plugins/index.js`):

```ts
// typescript / ES6
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default function (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) {
  initVisualRegressionPlugin(on, config);

  return config;
}

// javascript
const {
  initPlugin: initVisualRegressionPlugin,
} = require('@pixsame/cypress-plugin-visual-regression-diff/plugins');

module.exports = function (on, config) {
  initVisualRegressionPlugin(on, config);

  return config;
};
```

That's it - now let's see how to use the library in [usage section](/docs/getting-started/usage).

That is it. Learn how to write a test in the [usage guide](/docs/getting-started/usage), and see every option on the [configuration page](/docs/reference/configuration).

## Batch review mode

Batch Review Mode lets you run a full test suite without stopping on the first visual diff failure. Instead, all failing snapshots are collected and presented in an interactive review UI after the tests complete — so you can approve or skip changes in bulk.

### Additions in headed mode (non-CI environments)

When enabled, a floating action button (FAB) appears in the bottom-right corner of the Cypress test runner. As tests run:

- Whenever a `matchImage()` call exceeds the diff threshold, the counter badge on the FAB increments instead of immediately throwing an error.
- Once all tests finish, an error is thrown with the total count of failures.
- Clicking the FAB opens a carousel where you can review each failing snapshot side-by-side (new vs. old) and either **replace** the baseline or **skip** the change.

![Batch Review Mode demo](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> Note: Batch mode will become the default in the next major version. To keep an old behaviour, make sure to set configuration property to `false` (see below for more details).

### How to enable

Batch Review Mode is a global option (it cannot be passed to `matchImage` directly). Enable it with the `pluginVisualRegressionBatchReviewMode` key:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

```ts
// cypress.config.ts (Cypress <15.10, deprecated in newer versions)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### Reviewing passing images

Images that differ from the baseline but stay within `maxDiffThreshold` do not fail the test, yet they are still collected. The carousel has a **Show passing** checkbox that lets you browse them (each is marked with a `passed` badge) and replace their baseline too, e.g. to get rid of small accumulated drift.

The checkbox is unchecked by default. Use the `pluginVisualRegressionBatchReviewModeShowPassingImages` key to make it checked by default:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true,pluginVisualRegressionBatchReviewModeShowPassingImages=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
    pluginVisualRegressionBatchReviewModeShowPassingImages: true,
  },
});
```

Toggling the checkbox in the runner is remembered in the browser's local storage and takes precedence over the configured value on subsequent runs.

## FAQ

### Why screenshots doesn't conform to the `viewport` set in my Cypress configuration?

Screenshots in Cypress do not scale to the viewport size by default. You can change this behavior:

- globally, by changing default screenshot configuration: `Cypress.Screenshot.defaults({ capture: 'viewport' });`
- locally, by passing screenshot configuration directly to the `.matchImage` command: `cy.matchImage({ screenshotConfig: { capture: 'viewport' } });`

### I've upgraded version of this plugin and all on my baseline images has been automatically updated. Why?

Sometimes we need to do a breaking change in image comparison or image generation algorithms. To provide you with the easiest upgrade path - the plugin updates your baseline images automatically. Just commit them to your repository after the plugin upgrade and you are good to go!

### Screenshots look different between `cypress run` and `cypress open`. How do I fix it?

This is typically caused by device pixel ratio differences between headless and headed modes. Use the `forceDeviceScaleFactor` option to normalize the scale factor to `1`:

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

Or set it globally via expose variable:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

For persistent viewport size differences, consider setting the browser window size explicitly in `setupNodeEvents`:

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.name === 'chrome' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

### How do I use this plugin alongside other Cypress plugins that also register `setupNodeEvents` events?

Cypress only supports a single handler per event. If multiple plugins register the same event (e.g. `after:screenshot`), only the last one will be called. To compose multiple plugins safely, use [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix):

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // register other plugins using fixedOn here
    },
  },
});
```

### How do I integrate with mochawesome or other reporters that embed screenshot images?

The plugin stores baseline images outside the default `cypress/screenshots/` directory. Some reporters (like `cypress-mochawesome-reporter`) expect screenshots to be in that folder.

Use the `processImgPath` task hook to control where the screenshot file is placed. Override it in `setupNodeEvents` after calling `initPlugin`:

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // Override the path processor to keep screenshots accessible to the reporter
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // return a new path, or the same path to keep default behavior
      return path;
    },
  });
}
```

### How to fail on any visual difference, no matter how small?

Set `maxDiffThreshold` to `0`:

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

Or globally via an expose variable:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

### Why is the actual screenshot deleted after a successful image comparison?

When images match, the `.actual.png` file is temporary and gets cleaned up after the comparison. Only the baseline image (no suffix) is kept. This avoids storing redundant files.

When images do not match, the `.actual.png` file is kept and carries the same plugin metadata as a baseline image. You can safely rename or copy it over the baseline (e.g. in a CI job that opens a PR with updated baselines) - the plugin will treat it as an up-to-date baseline and won't rewrite it on the next run.

If you need actual screenshots to stay accessible for a reporter (e.g. `cypress-mochawesome-reporter`), use the `processImgPath` task hook to control where screenshots are stored. See [How do I integrate with mochawesome or other reporters that embed screenshot images?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

### How to remove spaces from screenshot filenames?

Screenshot filenames are derived from Cypress test titles, which may contain spaces. To use a filename without spaces, pass a custom `title` option to each `matchImage` call:

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

To apply this globally for all `matchImage` calls, override the command in your support file (`cypress/support/commands.ts`):

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

### How to include the browser name in image filenames (for cross-browser testing)?

Different browsers may render fonts and elements slightly differently. To keep separate baseline images per browser, override `matchImage` in your support file (`cypress/support/commands.ts`) to set a browser-specific `imagesPath`:

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

This creates separate image directories per browser (e.g. `__image_snapshots__/chrome/`, `__image_snapshots__/firefox/`).

### How to generate an HTML report showing baseline, diff, and actual images?

The plugin provides a built-in visual comparison overlay in the Cypress UI — clicking "See comparison" on a failed test shows the baseline, diff, and actual images side by side.

For CI or sharable HTML reports, integrate with a reporter such as [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter). See [How do I integrate with mochawesome or other reporters that embed screenshot images?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images) for setup details.


## Moving from @frsource

Already using `@frsource/cypress-plugin-visual-regression-diff`? Moving over is a rename. See the [migration guide](/docs/getting-started/migrate-from-frsource).
