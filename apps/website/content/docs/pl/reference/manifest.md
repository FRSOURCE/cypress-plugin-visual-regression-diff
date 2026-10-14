---
title: Schemat manifestu
description: Niezależny od runnera manifest uruchomienia, który czytają i zapisują narzędzia pixsame. Specyfikacja jest na visual-regression.dev.
order: 2
reviewed: false
---

# Schemat manifestu

Manifest to czytelny maszynowo zapis każdego porównania zrzutów ekranu wykonanego podczas uruchomienia testów. Zapisuje go narzędzie do regresji wizualnej, a czytają narzędzia CI: boty komentujące PR-y, dashboardy do przeglądu i narzędzia do akceptacji zmian. To umowa między runnerem testów a wszystkim, co działa dalej.

To otwarty format niezależny od runnera i niezwiązany z pixsame. Specyfikacja, opis pól, konwertery dla innych runnerów i viewer są utrzymywane na [visual-regression.dev/manifest](https://visual-regression.dev/manifest), w otwartym repozytorium [visual-regression](https://github.com/visual-regression/visual-regression). JSON Schema, typy, reader, writer i merger są publikowane jako [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) w npm.

Każde narzędzie pixsame czyta i zapisuje ten format, a GitHub App i platforma hostowana przyjmują manifest z dowolnego runnera.
