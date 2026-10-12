---
reviewed: false
source: 3d5b703737db7cd3
---

## Pierwsze kroki

### Instalacja

Bibliotekę zainstalujesz swoim ulubionym menedżerem pakietów:

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

Następnie musisz zaimportować bibliotekę:

- najpierw w pliku support (domyślnie znajduje się w `cypress/support/index.js`):

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- a potem w `cypress.config.js` (lub `cypress.config.ts`):

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin trzeba wywołać w tej sekcji, w której jest używany: e2e lub component
  e2e: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
  component: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
});
```

To wszystko - teraz zobaczmy, jak korzystać z biblioteki, w [sekcji o użyciu](#usage).

## Użycie

Po instalacji wystarczy, że w teście napiszesz:

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

Albo, jeśli chcesz zrobić zrzut ekranu całego dokumentu:

```ts
cy.matchImage();
```

Komenda `matchImage` robi zrzut ekranu i porównuje go z obrazem z poprzedniego uruchomienia. W razie regresji test nie przejdzie, a ty dostaniesz przycisk "See comparison", który pokaże, gdzie leży problem.

## Przykład

Nadal masz problemy z instalacją? Zajrzyj do [katalogu examples w tym repozytorium](https://github.com/pixsame/pixsame/tree/main/examples), żeby zobaczyć, jak użyć tego pluginu w środowisku Cypress przy testach e2e lub komponentowych w twoim projekcie.

## Automatyczne usuwanie nieużywanych obrazów

Warto usuwać zrzuty ekranu wygenerowane przez plugin, z których nie korzysta już żaden test.
Włącz tę funkcję przez zmienną expose i ciesz się odzyskanym miejscem na dysku 🚀:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Konfiguracja

Plugin skonfigurujesz:

- przekazując konfigurację jako argument komendy `matchImage`:

```ts
cy.matchImage({
  // konfiguracja zrzutu ekranu, przekazywana bezpośrednio do metody screenshot w Cypress: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
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
  // czy automatycznie aktualizować obrazy - przydatne na CI
  // - true: nadpisuj wszystkie baseline'y bez porównywania (najszybsze)
  // - 'failures-only': najpierw porównaj, aktualizuj baseline tylko wtedy, gdy diff przekroczy próg
  // - false: nigdy nie aktualizuj baseline'ów automatycznie
  // domyślnie: false
  updateImages: true,
  // ścieżka katalogu, w którym będą zapisywane zrzuty ekranu
  // ścieżki względne są rozwiązywane względem katalogu głównego projektu
  // ścieżki bezwzględne (zarówno na unixie, jak i na Windowsie) są obsługiwane
  // separatory ścieżek plugin znormalizuje zależnie od systemu; zawsze używaj / jako separatora, np.: C:/my-directory/nested dla notacji dyskowej w stylu Windows
  // w ścieżce dostępna jest jedna zmienna specjalna:
  // - {spec_path} - ścieżka względna od katalogu głównego projektu do katalogu bieżącego pliku spec (np. `/src/components/my-tested-component`)
  // domyślnie: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maksymalny próg, powyżej którego test ma nie przejść
  // domyślnie: 0.01
  maxDiffThreshold: 0.1,
  // wymusza ustawienie współczynnika skalowania na wartość "1"
  // pomaga, gdy zrzuty ekranu są skalowane 2x na ekranach o wysokiej gęstości, np. Mac Retina
  // domyślnie: true
  forceDeviceScaleFactor: false,
  // tytuł używany do nazwania pliku obrazu
  // domyślnie: Cypress.currentTest.titlePath (tytuł twojego testu)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // ścieżka do własnego obrazu, z którym ma być robione porównanie
  // zamiast porównywania z obrazem z poprzedniego uruchomienia
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

Kilka opcji przekazuj w jednej fladze, rozdzielone przecinkami. Gdy `--expose` (lub `--env`) powtórzy się, Cypress weźmie pod uwagę tylko ostatnie wystąpienie.

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

Więcej sposobów ustawiania zmiennych expose [znajdziesz tutaj](https://on.cypress.io/expose).

## Tryb Batch Review

Tryb Batch Review pozwala uruchomić cały zestaw testów bez zatrzymywania się na pierwszym nieudanym porównaniu wizualnym. Zamiast tego wszystkie nieudane snapshoty są zbierane i po zakończeniu testów prezentowane w interaktywnym UI do przeglądu - dzięki czemu zmiany możesz zatwierdzać lub pomijać hurtowo.

### Dodatki w trybie headed (środowiska poza CI)

Po włączeniu w prawym dolnym rogu runnera Cypress pojawia się pływający przycisk akcji (FAB). W trakcie działania testów:

- Za każdym razem, gdy wywołanie `matchImage()` przekroczy próg diffa, licznik na FAB-ie się zwiększa, zamiast od razu rzucać błąd.
- Gdy wszystkie testy się skończą, rzucany jest błąd z łączną liczbą niepowodzeń.
- Kliknięcie FAB-a otwiera karuzelę, w której przejrzysz każdy nieudany snapshot obok siebie (nowy vs. stary) i albo **zastąpisz** baseline, albo **pominiesz** zmianę.

![Demo Trybu Batch Review](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> Uwaga: tryb batch stanie się domyślny w następnej wersji major. Jeśli chcesz zachować dotychczasowe zachowanie, ustaw tę opcję konfiguracji na `false` (szczegóły poniżej).

### Jak włączyć

Tryb Batch Review to opcja globalna (nie da się jej przekazać bezpośrednio do `matchImage`). Włączysz go kluczem `pluginVisualRegressionBatchReviewMode`:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

```ts
// cypress.config.ts (Cypress <15.10, przestarzałe w nowszych wersjach)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### Przeglądanie obrazów, które przeszły

Obrazy, które różnią się od baseline'u, ale mieszczą się w `maxDiffThreshold`, nie oblewają testu, a mimo to są zbierane. Karuzela ma checkbox **Show passing**, który pozwala je przejrzeć (każdy ma odznakę `passed`) i również zastąpić ich baseline, np. żeby pozbyć się drobnego, nawarstwiającego się dryfu.

Checkbox jest domyślnie odznaczony. Użyj klucza `pluginVisualRegressionBatchReviewModeShowPassingImages`, żeby był domyślnie zaznaczony:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true,pluginVisualRegressionBatchReviewModeShowPassingImages=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
    pluginVisualRegressionBatchReviewModeShowPassingImages: true,
  },
});
```

Przełączenie checkboxa w runnerze jest zapamiętywane w local storage przeglądarki i przy kolejnych uruchomieniach ma pierwszeństwo przed wartością z konfiguracji.

## FAQ

### Dlaczego zrzuty ekranu nie trzymają się `viewport` ustawionego w mojej konfiguracji Cypress?

Zrzuty ekranu w Cypress domyślnie nie skalują się do rozmiaru viewportu. Możesz to zmienić:

- globalnie, zmieniając domyślną konfigurację zrzutów ekranu: `Cypress.Screenshot.defaults({ capture: 'viewport' });`
- lokalnie, przekazując konfigurację zrzutu ekranu bezpośrednio do komendy `.matchImage`: `cy.matchImage({ screenshotConfig: { capture: 'viewport' } });`

### Zaktualizowałem wersję pluginu i wszystkie moje obrazy baseline zostały automatycznie podmienione. Dlaczego?

Czasem musimy wprowadzić zmianę łamiącą kompatybilność w algorytmach porównywania lub generowania obrazów. Żeby aktualizacja była dla ciebie jak najprostsza, plugin sam aktualizuje twoje baseline'y. Po aktualizacji pluginu po prostu zacommituj je do repozytorium i gotowe!

### Zrzuty ekranu wyglądają inaczej w `cypress run` i `cypress open`. Jak to naprawić?

Zwykle wynika to z różnic w device pixel ratio między trybem headless a headed. Użyj opcji `forceDeviceScaleFactor`, żeby znormalizować współczynnik skalowania do `1`:

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

Albo ustaw to globalnie przez zmienną expose:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

Jeśli różnice w rozmiarze viewportu nie znikają, rozważ jawne ustawienie rozmiaru okna przeglądarki w `setupNodeEvents`:

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.name === 'chrome' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

### Jak używać tego pluginu razem z innymi pluginami Cypress, które też rejestrują zdarzenia w `setupNodeEvents`?

Cypress obsługuje tylko jeden handler na zdarzenie. Jeśli kilka pluginów zarejestruje to samo zdarzenie (np. `after:screenshot`), wywołany zostanie tylko ostatni z nich. Żeby bezpiecznie połączyć kilka pluginów, użyj [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix):

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // tutaj zarejestruj pozostałe pluginy, używając fixedOn
    },
  },
});
```

### Jak zintegrować plugin z mochawesome lub innymi reporterami, które osadzają zrzuty ekranu?

Plugin przechowuje obrazy baseline poza domyślnym katalogiem `cypress/screenshots/`. Niektóre reportery (np. `cypress-mochawesome-reporter`) oczekują, że zrzuty ekranu będą właśnie w tym folderze.

Użyj hooka taska `processImgPath`, żeby kontrolować, gdzie trafia plik zrzutu ekranu. Nadpisz go w `setupNodeEvents` po wywołaniu `initPlugin`:

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // nadpisz przetwarzanie ścieżki, żeby zrzuty ekranu pozostały dostępne dla reportera
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // zwróć nową ścieżkę albo tę samą, żeby zachować domyślne zachowanie
      return path;
    },
  });
}
```

### Jak oblać test przy każdej różnicy wizualnej, nawet najmniejszej?

Ustaw `maxDiffThreshold` na `0`:

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

Albo globalnie przez zmienną expose:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

### Dlaczego aktualny zrzut ekranu jest usuwany po udanym porównaniu obrazów?

Gdy obrazy się zgadzają, plik `.actual.png` jest tymczasowy i po porównaniu jest sprzątany. Zostaje tylko obraz baseline (bez sufiksu). Dzięki temu nie trzymamy zbędnych plików.

Gdy obrazy się nie zgadzają, plik `.actual.png` zostaje i niesie te same metadane pluginu co obraz baseline. Możesz go bezpiecznie przemianować lub skopiować w miejsce baseline'u (np. w jobie CI, który otwiera pull requesta ze zaktualizowanymi baseline'ami) - plugin potraktuje go jako aktualny baseline i nie nadpisze go przy następnym uruchomieniu.

Jeśli potrzebujesz, żeby aktualne zrzuty ekranu pozostały dostępne dla reportera (np. `cypress-mochawesome-reporter`), użyj hooka taska `processImgPath`, żeby kontrolować, gdzie są zapisywane. Zobacz [Jak zintegrować plugin z mochawesome lub innymi reporterami, które osadzają zrzuty ekranu?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

### Jak usunąć spacje z nazw plików zrzutów ekranu?

Nazwy plików zrzutów ekranu pochodzą od tytułów testów Cypress, które mogą zawierać spacje. Żeby użyć nazwy pliku bez spacji, przekaż własną opcję `title` do każdego wywołania `matchImage`:

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

Żeby zastosować to globalnie dla wszystkich wywołań `matchImage`, nadpisz komendę w pliku support (`cypress/support/commands.ts`):

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

### Jak dodać nazwę przeglądarki do nazw plików obrazów (testy cross-browser)?

Różne przeglądarki mogą nieco inaczej renderować fonty i elementy. Żeby trzymać osobne obrazy baseline dla każdej przeglądarki, nadpisz `matchImage` w pliku support (`cypress/support/commands.ts`) i ustaw `imagesPath` zależny od przeglądarki:

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

W ten sposób powstają osobne katalogi obrazów dla każdej przeglądarki (np. `__image_snapshots__/chrome/`, `__image_snapshots__/firefox/`).

### Jak wygenerować raport HTML z obrazami baseline, diff i aktualnym?

Plugin ma wbudowaną nakładkę porównania wizualnego w UI Cypress - kliknięcie "See comparison" przy nieudanym teście pokazuje obok siebie obraz baseline, diff i aktualny.

Na CI albo do raportów HTML, którymi chcesz się dzielić, zintegruj plugin z reporterem takim jak [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter). Szczegóły konfiguracji znajdziesz w [Jak zintegrować plugin z mochawesome lub innymi reporterami, które osadzają zrzuty ekranu?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images).
