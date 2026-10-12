---
title: 安装
description: 安装 pixsame 的 Cypress 插件，并运行您的第一个视觉回归测试。
order: 1
reviewed: false
---

# 安装

Cypress 插件现已可用。Playwright 插件和 GitHub App 即将推出。

## 添加依赖包

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## 接入插件

在您的 support 文件（默认为 `cypress/support/e2e.ts`）中导入命令：

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

然后在 `cypress.config.ts` 中注册插件。在您用到的每个配置段（`e2e` 或 `component`）中调用 `initPlugin`：

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

## 生成第一张快照

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或者对整个页面截图
cy.matchImage();
```

`matchImage` 会截取一张截图，并与上一次运行的截图进行比对。一旦出现回归，测试会失败，并且 Cypress 运行器中会出现一个 **See comparison** 按钮，点击即可直接查看差异。

## 正在使用 `@frsource`？

该包已更名，迁移只需改一行代码。请参阅[从 @frsource 迁移](/docs/getting-started/migrate-from-frsource)。
