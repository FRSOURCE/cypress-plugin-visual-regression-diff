---
title: Usage
description: Configure matchImage and keep your baselines tidy.
order: 2
---

# Usage

The plugin adds one command, `matchImage`, to every Cypress test.

## Compare an element or the page

```ts
cy.get('.an-element-of-your-choice').matchImage();

// or the whole document
cy.matchImage();
```

## Configure a comparison

Pass options to `matchImage` per call. Every option is described on the [Configuration](/docs/reference/configuration) page:

```ts
cy.matchImage({
  // forwarded to the Cypress screenshot API
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch options
  diffConfig: { threshold: 0.01 },
  // create baselines that do not exist yet (default: true)
  createMissingImages: false,
  // overwrite baselines: true | 'failures-only' | false (default: false)
  updateImages: false,
});
```

## Clean up unused images

Remove baselines that no test uses anymore:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

On Cypress older than 15.10 pass the same key with `--env` instead.

## More

Every option is on the [Configuration](/docs/reference/configuration) page. Questions and ideas are welcome in [GitHub discussions](https://github.com/pixsame/pixsame/discussions).
