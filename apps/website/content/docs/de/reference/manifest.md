---
title: Manifest-Schema
description: Das runner-unabhängige Lauf-Manifest, das pixsame-Tools lesen und schreiben. Die Spezifikation liegt auf visual-regression.dev.
order: 2
reviewed: false
---

# Manifest-Schema

Das Manifest ist eine maschinenlesbare Aufzeichnung aller Screenshot-Vergleiche eines Testlaufs. Ein Visual-Regression-Tool schreibt es, und CI-Werkzeuge wie PR-Kommentar-Bots, Review-Dashboards und Freigabe-Tools lesen es. Es ist der Vertrag zwischen einem Test-Runner und allem, was danach kommt.

Es ist ein offenes, runner-unabhängiges Format, das nicht an pixsame gebunden ist. Die Spezifikation, die Feldreferenz, die Konverter für andere Runner und der Viewer werden auf [visual-regression.dev/manifest](https://visual-regression.dev/manifest) im Open-Source-Repository [visual-regression](https://github.com/visual-regression/visual-regression) gepflegt. JSON Schema, Typen, Reader, Writer und Merger erscheinen als [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) auf npm.

Jedes pixsame-Tool liest und schreibt dieses Format, und die GitHub App sowie die gehostete Plattform akzeptieren ein Manifest von jedem Runner.
