# Changelog

## [4.0.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v3.3.10...@frsource/cypress-plugin-visual-regression-diff-v4.0.0) (2026-06-26)


### ⚠ BREAKING CHANGES

* `imagesDir` option removed

### Features

* next example ([#254](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/254)) ([247a20a](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/247a20ac85d197333a3652ad354319b0fd9501a5))
* release 4.0.0 ([#315](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/315)) ([77dbfdd](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/77dbfdd090d37e3d1a69a6545b8f6573e458a10a))


### Bug Fixes

* **deps:** update all non-major dependency bump ([#260](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/260)) ([da9f52c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/da9f52c77e9a60379d51e73205ff6a314eb093b3))
* **deps:** update all non-major dependency bump ([#268](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/268)) ([4bc8247](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/4bc8247be85176b18aa2cb9cfa819a44692764c8))
* **deps:** update all non-major dependency bump ([#274](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/274)) ([3ff8d88](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/3ff8d88f5d5b4256cce23d0544d114e2c0748526))
* **deps:** update all non-major dependency bump ([#283](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/283)) ([a2d7379](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/a2d737956fa311b84ec6d96b6986108309c0f43d))
* **deps:** update all non-major dependency bump ([#285](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/285)) ([aea122c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/aea122ceb6232a3c5be6a57edcc962383019d82c))
* **deps:** update all non-major dependency bump ([#297](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/297)) ([6ac55f0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/6ac55f01625aba2b60938492380bbeac4db74bde))
* **deps:** update all non-major dependency bump ([#298](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/298)) ([2181dcf](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/2181dcf6b1f0146d20d72ee9f31f7630d5a19538))
* **deps:** update all non-major dependency bump ([#312](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/312)) ([e265d7b](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/e265d7b73886824e38362c8054a571702c6728bc))
* **deps:** update dependency @frsource/base64 to v1.0.26 ([#288](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/288)) ([36aafcd](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/36aafcd1fac9534981df2069d07c0bc9165afeb2))
* example documentation ([c14d935](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/c14d935688a3ce248611eb35baec0ebf13ce69e7))

## [4.0.0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v3.3.10...@frsource/cypress-plugin-visual-regression-diff-v4.0.0) (2026-06-26)


### ⚠ BREAKING CHANGES

* Cypress minimum version raised to 13
* Node.js minimum version raised to 14
* Attempt separator changed: space → underscore (resolves [#196](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/196))
The number appended to snapshot filenames on retried attempts is now separated by an underscore instead of a space.

| Before | After |
|---|---|
| `test name #0.png` | `test name_#0.png` |

**Migration:** regenerate your baseline snapshots, or batch-rename existing files:

```bash
# Example rename (macOS/Linux)
find . -name "* #*.png" | while read f; do
  mv "$f" "${f/ #/_#}"
done
```

# `imagesDir` option removed

The `imagesDir` option was deprecated in v3 and has been fully removed. Use `imagesPath` instead.

```diff
- pluginVisualRegressionImagesDir: 'cypress/__image_snapshots__'
+ pluginVisualRegressionImagesPath: 'cypress/__image_snapshots__'
```

For migration, look to the end of release note.

### Features

* next example ([#254](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/254)) ([247a20a](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/247a20ac85d197333a3652ad354319b0fd9501a5))

* `updateImages: 'failures-only'` (resolves [#204](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/204))

A new value for the existing `updateImages` option. When set, baselines are only overwritten when the diff exceeds the configured threshold — unchanged screenshots are left as-is. Images that haven't changed are skipped, speeding up the run.

```js
cy.matchImage({ updateImages: 'failures-only' });
// or as a global default in cypress.config.js:
pluginVisualRegressionUpdateImages: 'failures-only'
```

* `processImgPath` task hook (closes [#179](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/179), resolves [#106](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/106))

A new `cypressPluginVisualRegressionDiff:processImgPath` Cypress task is called after every screenshot, giving you full control over where the file ends up. By default it is a no-op, but you can override it in `setupNodeEvents` to integrate with reporters such as [cypress-mochawesome-reporter](https://github.com/LironEr/cypress-mochawesome-reporter):

```js
// cypress.config.js
on('task', {
  'cypressPluginVisualRegressionDiff:processImgPath'({ imgPath }) {
    // return a modified path, or return imgPath unchanged
    return imgPath;
  },
});
```


### Bug Fixes

* "Update screenshot" button now respects `matchAgainstPath` (resolves [#259](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/259), [#282](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/282))
* Auto-cleanup no longer deletes snapshots from the other testing type (fixes [#178](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/178))

### Dependency Upgrades

| Dependency | Old | New | Notes |
|---|---|---|---|
| Cypress (peer) | ≥ 10 | ≥ 13 | |
| sharp | 0.32.x | 0.33.5 | Resolves CVE-2023-4863 (libwebp vulnerability) |
| Node.js (engine) | ≥ 12 | ≥ 14 | Aligned with Cypress 13 |
| Vitest | 1.x | 2.x | Internal — does not affect plugin consumers |

* **deps:** update all non-major dependency bump ([#260](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/260)) ([da9f52c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/da9f52c77e9a60379d51e73205ff6a314eb093b3))
* **deps:** update all non-major dependency bump ([#268](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/268)) ([4bc8247](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/4bc8247be85176b18aa2cb9cfa819a44692764c8))
* **deps:** update all non-major dependency bump ([#274](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/274)) ([3ff8d88](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/3ff8d88f5d5b4256cce23d0544d114e2c0748526))
* **deps:** update all non-major dependency bump ([#283](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/283)) ([a2d7379](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/a2d737956fa311b84ec6d96b6986108309c0f43d))
* **deps:** update all non-major dependency bump ([#285](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/285)) ([aea122c](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/aea122ceb6232a3c5be6a57edcc962383019d82c))
* **deps:** update all non-major dependency bump ([#297](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/297)) ([6ac55f0](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/6ac55f01625aba2b60938492380bbeac4db74bde))
* **deps:** update all non-major dependency bump ([#298](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/298)) ([2181dcf](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/2181dcf6b1f0146d20d72ee9f31f7630d5a19538))
* **deps:** update all non-major dependency bump ([#312](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/312)) ([e265d7b](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/e265d7b73886824e38362c8054a571702c6728bc))
* **deps:** update dependency @frsource/base64 to v1.0.26 ([#288](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/288)) ([36aafcd](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/36aafcd1fac9534981df2069d07c0bc9165afeb2))

### Documentation

New FAQ entries have been added covering:

- **Screenshot size differences between `cypress run` and `cypress open`** ([#294](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/294)) — use `forceDeviceScaleFactor: true` to normalise the device pixel ratio.
- **Composing with other plugins that also register `setupNodeEvents`** ([#302](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/302)) — use [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) to avoid handlers overwriting each other.
- **Integrating diff images with mochawesome** ([#106](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/106)) — use the new `processImgPath` hook to point the reporter at the correct path.
- Answers to several long-standing community discussions: [#96](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/96), [#189](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/189), [#214](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/214), [#226](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/226), [#309](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/discussions/309).

## [3.3.10](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/compare/@frsource/cypress-plugin-visual-regression-diff-v3.3.9...@frsource/cypress-plugin-visual-regression-diff-v3.3.10) (2023-06-17)


### Bug Fixes

* **deps:** update dependency @frsource/base64 to v1.0.17 ([#244](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/244)) ([d55c677](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/commit/d55c67734d8526172bc1231128eb9faa8e39d51b))
