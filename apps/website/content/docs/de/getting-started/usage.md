---
title: Verwendung
description: Konfigurieren Sie matchImage und halten Sie Ihre Baselines aufgeräumt.
order: 2
reviewed: false
---

# Verwendung

Das Plugin fügt jedem Cypress-Test einen Command hinzu: `matchImage`.

## Ein Element oder die Seite vergleichen

```ts
cy.get('.an-element-of-your-choice').matchImage();

// oder das gesamte Dokument
cy.matchImage();
```

## Einen Vergleich konfigurieren

Übergeben Sie Optionen pro Aufruf an `matchImage`. Alle Optionen sind auf der Seite [Konfiguration](/docs/reference/configuration) beschrieben:

```ts
cy.matchImage({
  // wird an die Screenshot-API von Cypress weitergereicht
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch-Optionen
  diffConfig: { threshold: 0.01 },
  // noch nicht vorhandene Baselines anlegen (Standard: true)
  createMissingImages: false,
  // Baselines überschreiben: true | 'failures-only' | false (Standard: false)
  updateImages: false,
});
```

## Ungenutzte Bilder aufräumen

Entfernen Sie Baselines, die kein Test mehr verwendet:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

Bei Cypress-Versionen vor 15.10 übergeben Sie denselben Schlüssel stattdessen über `--env`.

## Mehr

Alle Optionen finden Sie auf der Seite [Konfiguration](/docs/reference/configuration). Fragen und Ideen sind in den [GitHub Discussions](https://github.com/pixsame/pixsame/discussions) willkommen.
