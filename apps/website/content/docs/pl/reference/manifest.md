---
title: Schemat manifestu
description: Niezależny od runnera manifest uruchomienia, który czyta i zapisuje każde narzędzie pixsame.
order: 2
reviewed: false
---

# Schemat manifestu

Manifest to czytelny maszynowo zapis każdego porównania zrzutów ekranu wykonanego podczas uruchomienia testów. Zapisuje go narzędzie do regresji wizualnej, a czytają narzędzia CI: boty komentujące PR-y, dashboardy review i narzędzia do zatwierdzania. To kontrakt między runnerem testów a wszystkim, co dzieje się dalej, publikowany jako otwarty standard `visual-regression-manifest`: JSON Schema, typy, reader, writer i merger.

Wszystko, co jest specyficzne dla runnera testów, znajduje się pod kluczem `runner`, więc ten sam plik opisuje uruchomienie w Cypress i w Playwright. Konsumenci muszą ignorować klucze, których nie znają.

## Pola najwyższego poziomu

| Pole                     | Opis                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                | Wersja formatu, obecnie `1`. Podbijana tylko przy zmianach łamiących kompatybilność.                                                            |
| `createdAt`, `updatedAt` | Znaczniki czasu w formacie ISO 8601. Plik jest nadpisywany po każdym porównaniu, więc jest kompletny nawet gdy uruchomienie zostanie przerwane. |
| `projectRoot`            | Ścieżka bezwzględna, względem której rozwiązywana jest każda ścieżka względna w manifeście.                                                     |
| `platform`               | Maszyna, na której uruchomiono testy: `os`, `arch` i opcjonalnie `osVersion`.                                                                   |
| `ci`                     | Metadane CI wykryte ze środowiska (`provider`, `repository`, `sha`, `branch`, `pullRequest`, `url` i inne) albo `null` poza CI.                 |
| `options`                | Globalne opcje narzędzia tak, jak zostały skonfigurowane, w słownictwie writera.                                                                |
| `runner`                 | Co uruchomiło testy. Wymagane jest tylko `name`.                                                                                                |
| `upload`                 | Dokąd wysłano obrazy, jeśli użyto usługi uploadu.                                                                                               |
| `entries`                | Jeden wpis na każde porównanie zrzutu ekranu.                                                                                                   |

## Wpisy

Każdy wpis zawiera `name` zrzutu ekranu, `test`, do którego należy, `status`, wynik `comparison`, ścieżki w `images` oraz informację, czy baseline został zapisany.

| Status             | Znaczenie                                                                  |
| ------------------ | -------------------------------------------------------------------------- |
| `passed`           | W granicach progu.                                                         |
| `failed`           | Powyżej progu. Obraz aktualny i obraz diffa są zachowane do review.        |
| `missing-baseline` | Baseline nie istnieje, a narzędzie dostało polecenie, żeby go nie tworzyć. |
| `created`          | Baseline nie istniał, więc nowy obraz stał się baseline'em.                |
| `updated`          | Baseline został nadpisany na żądanie.                                      |
| `approved`         | Baseline został podmieniony z poziomu interfejsu review.                   |

`failed` i `missing-baseline` to wpisy, które wymagają uwagi człowieka.

Opcjonalne pola wpisu dodają kontekst: `platform`, `target`, `variant` (urządzenie, motyw, locale itd.), `viewport`, `renderer` oraz `hashes` z sha256 każdego obrazu.

## Źródło prawdy

Pełny JSON Schema znajduje się w [repozytorium pixsame](https://github.com/pixsame/pixsame/tree/main/packages/visual-regression-manifest). Ta strona to tylko streszczenie.
