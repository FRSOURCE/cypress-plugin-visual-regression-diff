---
title: Konfiguracja
description: Wszystkie opcje pluginu pixsame dla Cypress, per wywołanie albo globalnie, plus tryb batch review.
order: 1
reviewed: false
---

# Konfiguracja

Każdą opcję możesz przekazać przy pojedynczym wywołaniu `matchImage` albo ustawić globalnie dla całego uruchomienia. Klucze globalne mają te same nazwy co opcje per wywołanie, tylko z prefiksem `pluginVisualRegression`.

## Opcje

- przekazując konfigurację jako argument komendy `matchImage`:

```ts
cy.matchImage({
  // konfiguracja zrzutu ekranu, przekazywana bezpośrednio do metody screenshot Cypress: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // domyślnie: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // opcje pixelmatch, zobacz: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // domyślnie: { includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // czy automatycznie tworzyć brakujące obrazy baseline
  // domyślnie: true
  createMissingImages: false,
  // czy automatycznie aktualizować obrazy - przydatne w CI
  // - true: nadpisuj wszystkie obrazy baseline bez porównywania (najszybsze)
  // - 'failures-only': najpierw porównaj, aktualizuj baseline tylko gdy diff przekroczy próg
  // - false: nigdy nie aktualizuj obrazów baseline automatycznie
  // domyślnie: false
  updateImages: true,
  // ścieżka katalogu, w którym będą zapisywane zrzuty ekranu
  // ścieżki względne są rozwiązywane względem katalogu głównego projektu
  // ścieżki bezwzględne (zarówno na unixie, jak i na windowsie) są obsługiwane
  // separatory ścieżek plugin normalizuje w zależności od systemu; zawsze używaj / jako separatora, np.: C:/my-directory/nested dla notacji dysków windowsowych
  // w ścieżce dostępna jest jedna specjalna zmienna:
  // - {spec_path} - ścieżka względna od katalogu głównego projektu do katalogu bieżącego pliku spec (np. `/src/components/my-tested-component`)
  // domyślnie: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maksymalny próg, po przekroczeniu którego test ma się nie powieść
  // domyślnie: 0.01
  maxDiffThreshold: 0.1,
  // wymusza ustawienie współczynnika skalowania na wartość "1"
  // pomaga, gdy zrzuty ekranu są skalowane 2x na ekranach o wysokiej gęstości, np. Mac Retina
  // domyślnie: true
  forceDeviceScaleFactor: false,
  // tytuł używany do nazwania pliku obrazu
  // domyślnie: Cypress.currentTest.titlePath (tytuł twojego testu)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // ścieżka do własnego obrazu, który ma zostać użyty do porównania
  // zamiast obrazu z poprzedniego uruchomienia
  // domyślnie: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- przez [globalną konfigurację expose](https://on.cypress.io/expose) (Cypress 15.10+). Nazwy kluczy konfiguracji są takie same jak klucze obiektu konfiguracji powyżej, tylko z dodanym prefiksem `pluginVisualRegression`, np.:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Kilka opcji przekazuj w jednej fladze, rozdzielone przecinkami. Gdy `--expose` (albo `--env`) powtórzysz, Cypress weźmie pod uwagę tylko ostatnie wystąpienie.

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

```ts
// cypress.config.ts (Cypress <15.10, przestarzałe w nowszych wersjach)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

Inne sposoby ustawiania zmiennych expose [znajdziesz tutaj](https://on.cypress.io/expose).

## Usuń nieużywane obrazy

Warto usuwać zrzuty ekranu wygenerowane przez plugin regresji wizualnej, z których nie korzysta już żaden test.
Włącz tę funkcję przez zmienną expose i ciesz się odzyskanym miejscem na dysku 🚀:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Tryb Batch Review

Tryb Batch Review uruchamia cały zestaw testów bez zatrzymywania się na pierwszym diffie. Niepowodzenia snapshotów są zbierane i, w trybie headed, przeglądane po zakończeniu uruchomienia w karuzeli, w której każdy baseline możesz podmienić albo pominąć. To opcja globalna, włączana kluczem `pluginVisualRegressionBatchReviewMode` (a `pluginVisualRegressionBatchReviewModeShowPassingImages` dodatkowo pokazuje obrazy, które przeszły):

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

Jak działa interfejs review, razem z demo, opisuje [sekcja Batch review mode na stronie pluginu dla Cypress](/products/cypress-plugin#batch-review-mode).
