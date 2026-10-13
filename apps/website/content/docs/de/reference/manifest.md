---
title: Manifest-Schema
description: Das runner-unabhängige Lauf-Manifest, das jedes pixsame-Tool liest und schreibt.
order: 2
reviewed: false
---

# Manifest-Schema

Das Manifest ist eine maschinenlesbare Aufzeichnung aller Screenshot-Vergleiche eines Testlaufs. Ein Visual-Regression-Tool schreibt es, und CI-Werkzeuge wie PR-Kommentar-Bots, Review-Dashboards und Freigabe-Tools lesen es. Es ist der Vertrag zwischen einem Test-Runner und allem, was danach kommt, und wird als offener Standard `visual-regression-manifest` veröffentlicht: ein JSON Schema, Typen, ein Reader, ein Writer und ein Merger.

Alles, was spezifisch für den Test-Runner ist, liegt unter `runner`, sodass dieselbe Datei einen Cypress-Lauf und einen Playwright-Lauf beschreibt. Konsumenten müssen unbekannte Schlüssel ignorieren.

## Felder auf oberster Ebene

| Feld                     | Beschreibung                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                | Formatversion, aktuell `1`. Wird nur bei Breaking Changes erhöht.                                                                               |
| `createdAt`, `updatedAt` | Zeitstempel nach ISO 8601. Die Datei wird nach jedem Vergleich neu geschrieben, sodass sie auch bei einem abgebrochenen Lauf vollständig ist.   |
| `projectRoot`            | Absoluter Pfad, gegen den alle relativen Pfade im Manifest aufgelöst werden.                                                                    |
| `platform`               | Die Maschine, auf der die Tests liefen: `os`, `arch` und optional `osVersion`.                                                                  |
| `ci`                     | Aus der Umgebung erkannte CI-Metadaten (`provider`, `repository`, `sha`, `branch`, `pullRequest`, `url` und mehr) oder `null` außerhalb von CI. |
| `options`                | Die konfigurierten globalen Tool-Optionen, im Vokabular des Writers.                                                                            |
| `runner`                 | Was die Tests ausgeführt hat. Nur `name` ist erforderlich.                                                                                      |
| `upload`                 | Wohin die Bilder hochgeladen wurden, falls ein Upload-Dienst verwendet wurde.                                                                   |
| `entries`                | Ein Eintrag pro Screenshot-Vergleich.                                                                                                           |

## Einträge

Jeder Eintrag hält den `name` des Screenshots fest, den zugehörigen `test`, einen `status`, das `comparison`-Ergebnis, die Pfade unter `images` und ob die Baseline geschrieben wurde.

| Status             | Bedeutung                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `passed`           | Innerhalb des Schwellenwerts.                                                                 |
| `failed`           | Über dem Schwellenwert. Das aktuelle Bild und das Diff-Bild werden für das Review aufbewahrt. |
| `missing-baseline` | Es existiert keine Baseline, und das Tool sollte keine anlegen.                               |
| `created`          | Es existierte keine Baseline, daher wurde das neue Bild zur Baseline.                         |
| `updated`          | Die Baseline wurde auf Anforderung überschrieben.                                             |
| `approved`         | Die Baseline wurde über eine Review-Oberfläche ersetzt.                                       |

`failed` und `missing-baseline` sind die Einträge, die einen Menschen brauchen.

Optionale Felder eines Eintrags liefern Kontext: `platform`, `target`, `variant` (Gerät, Theme, Locale und so weiter), `viewport`, `renderer` und `hashes` mit dem sha256 jedes Bildes.

## Quelle der Wahrheit

Das vollständige JSON Schema liegt im [pixsame-Repository](https://github.com/pixsame/pixsame/tree/main/packages/visual-regression-manifest). Diese Seite ist eine Zusammenfassung.
