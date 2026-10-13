---
title: Instalacja
description: Zainstaluj plugin pixsame dla Cypress i uruchom swój pierwszy test regresji wizualnej.
order: 1
reviewed: false
---

# Instalacja

Plugin dla Cypress jest dostępny już dziś. Plugin dla Playwright i GitHub App pojawią się wkrótce.

## Dodaj pakiet

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## Podepnij plugin

Zaimportuj komendy w pliku support (domyślnie `cypress/support/e2e.ts`):

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

Następnie zarejestruj plugin w `cypress.config.ts`. Wywołaj `initPlugin` w każdej sekcji, z której korzystasz: `e2e` lub `component`:

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

## Zrób pierwszy snapshot

```ts
cy.get('.an-element-of-your-choice').matchImage();

// albo cały dokument
cy.matchImage();
```

`matchImage` robi zrzut ekranu i porównuje go z tym z poprzedniego uruchomienia. Gdy coś się zepsuje, test kończy się niepowodzeniem, a przycisk **See comparison** otwiera diff bezpośrednio w runnerze Cypress.

## Przechodzisz z `@frsource`?

Pakiet zmienił nazwę, a przejście sprowadza się do jednej linijki. Zobacz [Migracja z @frsource](/docs/getting-started/migrate-from-frsource).
