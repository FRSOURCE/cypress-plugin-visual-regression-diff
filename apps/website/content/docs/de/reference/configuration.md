---
title: Konfiguration
description: Alle Optionen des pixsame Cypress-Plugins, pro Aufruf oder global, plus Batch Review Mode.
order: 1
reviewed: false
---

# Konfiguration

Jede Option kann pro Aufruf an `matchImage` übergeben oder global für den gesamten Lauf gesetzt werden. Die globalen Schlüssel heißen wie die Optionen pro Aufruf, mit dem Präfix `pluginVisualRegression`.

## Optionen

- indem Sie die Konfiguration als Argument an den `matchImage`-Command übergeben:

```ts
cy.matchImage({
  // Screenshot-Konfiguration, wird direkt an die Screenshot-Methode von Cypress weitergereicht: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // Standard: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch-Optionen, siehe: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // Standard: { includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // ob fehlende Baseline-Bilder automatisch angelegt werden sollen
  // Standard: true
  createMissingImages: false,
  // ob Bilder automatisch aktualisiert werden sollen - nützlich in CI
  // - true: alle Baseline-Bilder ohne Vergleich überschreiben (am schnellsten)
  // - 'failures-only': erst vergleichen, Baseline nur aktualisieren, wenn der Diff den Schwellenwert überschreitet
  // - false: Baseline-Bilder nie automatisch aktualisieren
  // Standard: false
  updateImages: true,
  // Verzeichnis, in dem die Screenshots abgelegt werden
  // relative Pfade werden relativ zum Projektstamm aufgelöst
  // absolute Pfade (unter Unix wie unter Windows) werden unterstützt
  // Pfadtrenner werden vom Plugin je nach Betriebssystem normalisiert; verwenden Sie immer / als Pfadtrenner, z. B.: C:/my-directory/nested für die Windows-Laufwerksnotation
  // Im Pfad steht eine spezielle Variable zur Verfügung:
  // - {spec_path} - relativer Pfad vom Projektstamm zum Verzeichnis der aktuellen Spec-Datei (z. B. `/src/components/my-tested-component`)
  // Standard: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maximaler Schwellenwert, ab dem der Test fehlschlagen soll
  // Standard: 0.01
  maxDiffThreshold: 0.1,
  // erzwingt den Skalierungsfaktor "1"
  // hilft gegen 2x skalierte Screenshots auf hochauflösenden Displays wie Mac Retina
  // Standard: true
  forceDeviceScaleFactor: false,
  // Titel, aus dem der Dateiname des Bildes gebildet wird
  // Standard: Cypress.currentTest.titlePath (Ihr Testtitel)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // Pfad zu einem eigenen Bild, das für den Vergleich verwendet werden soll
  // statt gegen das Bild aus dem vorherigen Lauf zu prüfen
  // Standard: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- über die [globale Expose-Konfiguration](https://on.cypress.io/expose) (Cypress 15.10+). Die Konfigurationsschlüssel heißen wie die Schlüssel des Konfigurationsobjekts oben, ergänzt um das Präfix `pluginVisualRegression`, z. B.:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (seit 15.10 veraltet, in 16 entfernt)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Übergeben Sie mehrere Optionen in einem Flag, durch Kommas getrennt. Wird `--expose` (oder `--env`) mehrfach angegeben, berücksichtigt Cypress nur das letzte Vorkommen.

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
// cypress.config.ts (Cypress <15.10, in neueren Versionen veraltet)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

Weitere Möglichkeiten, Expose-Variablen zu setzen, [finden Sie hier](https://on.cypress.io/expose).

## Ungenutzte Bilder aufräumen

Es lohnt sich, vom Visual-Regression-Plugin erzeugte Screenshots zu entfernen, die kein Test mehr verwendet.
Aktivieren Sie diese Funktion über eine Expose-Variable und freuen Sie sich über den freigewordenen Speicherplatz 🚀:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (seit 15.10 veraltet, in 16 entfernt)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Batch Review Mode

Der Batch Review Mode führt die gesamte Suite aus, ohne beim ersten visuellen Diff anzuhalten. Fehlgeschlagene Snapshots werden gesammelt und im Headed-Modus nach dem Lauf in einem Karussell durchgesehen, in dem Sie jede Baseline ersetzen oder überspringen. Es handelt sich um eine globale Option, die über den Schlüssel `pluginVisualRegressionBatchReviewMode` aktiviert wird (und `pluginVisualRegressionBatchReviewModeShowPassingImages`, um auch bestandene Bilder aufzulisten):

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (seit 15.10 veraltet, in 16 entfernt)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

Wie die Review-Oberfläche funktioniert, ist samt Demo im [Abschnitt Batch Review Mode auf der Cypress-Plugin-Seite](/products/cypress-plugin#batch-review-mode) beschrieben.
