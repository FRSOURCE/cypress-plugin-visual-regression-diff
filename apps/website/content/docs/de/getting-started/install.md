---
title: Installation
description: Installieren Sie das pixsame-Plugin für Cypress und führen Sie Ihren ersten visuellen Regressionstest aus.
order: 1
reviewed: false
---

# Installation

Das Cypress-Plugin ist bereits verfügbar. Das Playwright-Plugin und die GitHub App folgen in Kürze.

## Paket hinzufügen

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## Plugin einbinden

Importieren Sie die Commands in Ihrer Support-Datei (standardmäßig `cypress/support/e2e.ts`):

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

Registrieren Sie das Plugin anschließend in `cypress.config.ts`. Rufen Sie `initPlugin` in jedem Abschnitt auf, den Sie verwenden, also `e2e` oder `component`:

```ts
import { defineConfig } from 'cypress';
import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});
```

## Ersten Snapshot aufnehmen

```ts
cy.get('.an-element-of-your-choice').matchImage();

// oder das gesamte Dokument
cy.matchImage();
```

`matchImage` nimmt einen Screenshot auf und vergleicht ihn mit dem aus dem vorherigen Lauf. Bei einer Regression schlägt der Test fehl, und ein Button **See comparison** öffnet den Diff direkt im Cypress-Runner.

## Sie kommen von `@frsource`?

Das Paket wurde umbenannt, der Umstieg ist eine Sache von einer Zeile. Siehe [Migration von @frsource](/docs/getting-started/migrate-from-frsource).
