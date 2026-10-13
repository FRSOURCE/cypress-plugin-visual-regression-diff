---
title: 設定
description: pixsame Cypress 外掛的所有選項，可逐次呼叫或全域設定，另附批次審閱模式。
order: 1
reviewed: false
---

# 設定

每個選項都可以在呼叫 `matchImage` 時個別傳入，或是為整個執行過程全域設定。全域 key 的名稱與逐次呼叫的選項相同，只是加上 `pluginVisualRegression` 前綴。

## 選項

- 以引數的形式把設定傳給 `matchImage` 指令：

```ts
cy.matchImage({
  // 截圖設定，會直接傳給 Cypress 的 screenshot 方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 預設：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 選項，請參閱：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 預設：{ includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // 是否自動建立缺少的基準影像
  // 預設：true
  createMissingImages: false,
  // 是否自動更新影像，在 CI 中很實用
  // - true：不比對，直接覆寫所有基準影像（最快）
  // - 'failures-only'：先比對，只有在差異超過門檻時才更新基準影像
  // - false：永遠不自動更新基準影像
  // 預設：false
  updateImages: true,
  // 存放截圖影像的目錄路徑
  // 相對路徑會以專案根目錄為基準解析
  // 支援絕對路徑（unix 與 windows 皆可）
  // 外掛會依作業系統正規化路徑分隔符號，您應一律使用 / 作為分隔符號，例如 windows 磁碟機的寫法：C:/my-directory/nested
  // 路徑中可以使用一個特殊變數：
  // - {spec_path}：從專案根目錄到目前 spec 檔案所在目錄的相對路徑（例如 `/src/components/my-tested-component`）
  // 預設：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 差異超過此門檻時測試即失敗
  // 預設：0.01
  maxDiffThreshold: 0.1,
  // 強制把 scale factor 設為 "1"
  // 可避免在 Mac Retina 這類高解析度螢幕上截圖被放大 2 倍
  // 預設：true
  forceDeviceScaleFactor: false,
  // 用來命名影像檔案的標題
  // 預設：Cypress.currentTest.titlePath（您的測試標題）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 傳入自訂影像的路徑作為比對對象，
  // 而不是與上一次執行的影像比對
  // 預設：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 透過[全域 expose 設定](https://on.cypress.io/expose)（Cypress 15.10+）。設定 key 的名稱與上方設定物件的 key 相同，只是加上 `pluginVisualRegression` 前綴，例如：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起已棄用，16 中移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

多個選項請放在同一個旗標中，以逗號分隔。若重複傳入 `--expose`（或 `--env`），Cypress 只會保留最後一次出現的值。

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，較新版本已棄用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

更多設定 expose 變數的方式，[請參考這裡](https://on.cypress.io/expose)。

## 清理未使用的影像

把視覺回歸外掛產生、但已經沒有任何測試在使用的截圖移除，會很有幫助。
透過 expose 變數啟用這項功能，享受釋放出來的儲存空間 🚀：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起已棄用，16 中移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 批次審閱模式

批次審閱模式（Batch Review Mode）會跑完整個測試套件，而不會在第一個視覺差異處停下。失敗的快照會被收集起來，在 headed 模式下於執行結束後以輪播方式逐一審閱，您可以替換或略過每一張基準影像。這是一個全域選項，透過 `pluginVisualRegressionBatchReviewMode` key 啟用（加上 `pluginVisualRegressionBatchReviewModeShowPassingImages` 可以一併列出通過的影像）：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起已棄用，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

審閱介面的運作方式與示範，請參閱 [Cypress 外掛頁面的批次審閱模式一節](/products/cypress-plugin#batch-review-mode)。
