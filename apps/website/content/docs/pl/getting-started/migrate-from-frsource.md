---
title: Migracja z @frsource
description: Przejdź z @frsource/cypress-plugin-visual-regression-diff na @pixsame/cypress-plugin-visual-regression-diff w jednym kroku.
order: 3
reviewed: false
---

# Migracja z @frsource

## Dlaczego pakiet się przeniósł

Plugin był wcześniej publikowany jako `@frsource/cypress-plugin-visual-regression-diff`. Teraz mieszka w organizacji [pixsame](https://github.com/pixsame), obok otwartego formatu manifestu i reszty ekosystemu, i jest publikowany jako `@pixsame/cypress-plugin-visual-regression-diff`. Pakiet `@frsource` nie dostanie już nowych wydań, więc żeby nadal otrzymywać poprawki i nowe funkcje, musisz się przesiąść.

## Jak łatwo to zrobić

To tylko zmiana nazwy i nic więcej. Pierwsze wydanie `@pixsame` (1.0.0) to dokładnie ten sam kod co ostatnie wydanie `@frsource` (4.3.0), bez żadnych zmian w działaniu. Twoje obrazy baseline, konfiguracja i każda komenda `cy.*` działają dalej bez zmian.

## Użyj komendy migrate

Ostatnie wydania `@frsource` zawierają komendę, która zrobi zmianę nazwy za ciebie. Podmienia zależność w każdym `package.json` poniżej bieżącego katalogu, aktualizuje importy i odwołania do typów w plikach konfiguracji i support, a potem ponownie instaluje zależności menedżerem pakietów, który wykryje:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

Wypisuje pliki, które zamierza zmienić, i pyta o zgodę, zanim cokolwiek zapisze.

| Flaga          | Co robi                                         |
| -------------- | ----------------------------------------------- |
| `--dry-run`    | Tylko wypisuje pliki, które zostałyby zmienione |
| `--yes`        | Pomija pytanie o zgodę (wymagane w CI)          |
| `--no-install` | Pomija krok instalacji                          |

## Wolisz zrobić to ręcznie?

Podmień pakiet i zamień nazwę w importach:

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

Jeśli masz ten pakiet w `compilerOptions.types` w `tsconfig.json`, zmień nazwę również tam.
