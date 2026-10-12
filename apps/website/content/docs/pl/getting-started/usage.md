---
title: Użycie
description: Skonfiguruj matchImage i utrzymuj porządek w baseline'ach.
order: 2
reviewed: false
---

# Użycie

Plugin dodaje jedną komendę, `matchImage`, do każdego testu Cypress.

## Porównaj element albo całą stronę

```ts
cy.get('.an-element-of-your-choice').matchImage();

// albo cały dokument
cy.matchImage();
```

## Skonfiguruj porównanie

Opcje przekazujesz do `matchImage` przy każdym wywołaniu. Wszystkie opcje są opisane na stronie [Konfiguracja](/docs/reference/configuration):

```ts
cy.matchImage({
  // przekazywane do API zrzutów ekranu Cypress
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // opcje pixelmatch
  diffConfig: { threshold: 0.01 },
  // twórz baseline'y, które jeszcze nie istnieją (domyślnie: true)
  createMissingImages: false,
  // nadpisuj baseline'y: true | 'failures-only' | false (domyślnie: false)
  updateImages: false,
});
```

## Usuń nieużywane obrazy

Usuń baseline'y, z których nie korzysta już żaden test:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

W Cypress starszym niż 15.10 przekaż ten sam klucz przez `--env`.

## Więcej

Wszystkie opcje znajdziesz na stronie [Konfiguracja](/docs/reference/configuration). Pytania i pomysły mile widziane w [dyskusjach na GitHubie](https://github.com/pixsame/pixsame/discussions).
