---
title: 安裝
description: 安裝 pixsame 的 Cypress 外掛，並執行您的第一個視覺回歸測試。
order: 1
reviewed: false
---

# 安裝

Cypress 外掛現已可用。Playwright 外掛與 GitHub App 即將推出。

## 加入套件

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## 完成設定

在您的 support 檔案（預設為 `cypress/support/e2e.ts`）中匯入指令：

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

接著在 `cypress.config.ts` 中註冊外掛。在您使用的每個區段（`e2e` 或 `component`）中呼叫 `initPlugin`：

```ts
import { defineConfig } from 'cypress';
import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});
```

## 拍下您的第一張快照

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或是整個頁面
cy.matchImage();
```

`matchImage` 會擷取截圖，並與上一次執行的截圖進行比對。一旦發生回歸，測試就會失敗，並出現 **See comparison** 按鈕，讓您直接在 Cypress runner 中開啟差異畫面。

## 從 `@frsource` 過來的嗎？

套件已經更名，而遷移只需改一行。請參閱[從 @frsource 遷移](/docs/getting-started/migrate-from-frsource)。
