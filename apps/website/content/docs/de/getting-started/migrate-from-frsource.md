---
title: Migration von @frsource
description: Wechseln Sie in einem Schritt von @frsource/cypress-plugin-visual-regression-diff zu @pixsame/cypress-plugin-visual-regression-diff.
order: 3
reviewed: false
---

# Migration von @frsource

## Warum das Paket umgezogen ist

Das Plugin wurde früher als `@frsource/cypress-plugin-visual-regression-diff` veröffentlicht. Es gehört jetzt zur [pixsame](https://github.com/pixsame)-Organisation, neben dem Manifest-Standard und dem restlichen Ökosystem, und wird als `@pixsame/cypress-plugin-visual-regression-diff` veröffentlicht. Das `@frsource`-Paket erhält keine neuen Releases mehr. Um weiterhin Fixes und neue Features zu bekommen, müssen Sie also wechseln.

## Wie einfach das ist

Es ist eine reine Umbenennung, nichts weiter. Das erste `@pixsame`-Release (1.0.0) enthält denselben Code wie das letzte `@frsource`-Release (4.3.0), ohne Änderung im Verhalten. Ihre Baseline-Bilder, Ihre Konfiguration und jeder `cy.*`-Command funktionieren unverändert weiter.

## Den migrate-Command verwenden

Die letzten `@frsource`-Releases bringen einen Command mit, der die Umbenennung für Sie erledigt. Er benennt die Abhängigkeit in jeder `package.json` unterhalb des aktuellen Verzeichnisses um, aktualisiert Imports und Typreferenzen in Ihren Config- und Support-Dateien und installiert mit dem Paketmanager neu, den er vorfindet:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

Er listet die Dateien auf, die er ändern würde, und fragt nach, bevor er etwas schreibt.

| Flag           | Wirkung                                           |
| -------------- | ------------------------------------------------- |
| `--dry-run`    | Nur die Dateien auflisten, die sich ändern würden |
| `--yes`        | Rückfrage überspringen (in CI erforderlich)       |
| `--no-install` | Installationsschritt überspringen                 |

## Lieber von Hand?

Tauschen Sie das Paket aus und ersetzen Sie den Namen in Ihren Imports:

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

Falls Sie das Paket in `compilerOptions.types` einer `tsconfig.json` aufführen, benennen Sie es auch dort um.
