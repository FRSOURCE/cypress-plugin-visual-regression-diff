---
title: 使用方式
description: 設定 matchImage，並讓您的基準影像保持整潔。
order: 2
reviewed: false
---

# 使用方式

這個外掛會為每一個 Cypress 測試加入一個指令：`matchImage`。

## 比對某個元素或整個頁面

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或是整個頁面
cy.matchImage();
```

## 設定一次比對

每次呼叫 `matchImage` 時都可以傳入選項。所有選項都在[設定](/docs/reference/configuration)頁面中說明：

```ts
cy.matchImage({
  // 直接轉交給 Cypress 的 screenshot API
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch 選項
  diffConfig: { threshold: 0.01 },
  // 自動建立尚不存在的基準影像（預設：true）
  createMissingImages: false,
  // 覆寫基準影像：true | 'failures-only' | false（預設：false）
  updateImages: false,
});
```

## 清理未使用的影像

移除已經沒有任何測試在使用的基準影像：

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

若 Cypress 版本低於 15.10，請改用 `--env` 傳入同一個 key。

## 更多資訊

所有選項都在[設定](/docs/reference/configuration)頁面。歡迎到 [GitHub discussions](https://github.com/pixsame/pixsame/discussions) 提出問題與想法。
