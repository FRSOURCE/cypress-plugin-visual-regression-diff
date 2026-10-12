---
title: Migrate from @frsource
description: Move from @frsource/cypress-plugin-visual-regression-diff to @pixsame/cypress-plugin-visual-regression-diff in one step.
order: 3
---

# Migrate from @frsource

## Why the package moved

The plugin used to be published as `@frsource/cypress-plugin-visual-regression-diff`. It now lives in the [pixsame](https://github.com/pixsame) organization, next to the manifest standard and the rest of the ecosystem, and is published as `@pixsame/cypress-plugin-visual-regression-diff`. The `@frsource` package will not get new releases, so to keep receiving fixes and new features you need to switch.

## How easy it is

It is a rename and nothing else. The first `@pixsame` release (1.0.0) is the same code as the last `@frsource` release (4.3.0), with no change in behavior. Your baseline images, your configuration and every `cy.*` command keep working as they are.

## Use the migrate command

The last `@frsource` releases ship a command that does the rename for you. It renames the dependency in every `package.json` below the current directory, updates imports and type references in your config and support files, and reinstalls with the package manager it finds:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

It lists the files it would change and asks before writing anything.

| Flag | What it does |
| --- | --- |
| `--dry-run` | Only list the files that would change |
| `--yes` | Skip the question (required in CI) |
| `--no-install` | Skip the install step |

## Prefer to do it by hand?

Swap the package and replace the name in your imports:

```bash
npm uninstall @frsource/cypress-plugin-visual-regression-diff
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff
```

```diff
-import '@frsource/cypress-plugin-visual-regression-diff';
+import '@pixsame/cypress-plugin-visual-regression-diff';
-import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';
+import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
```

If you list the package in `compilerOptions.types` of a `tsconfig.json`, rename it there too.
