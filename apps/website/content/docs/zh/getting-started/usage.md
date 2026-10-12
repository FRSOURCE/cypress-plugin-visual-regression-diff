---
title: 使用
description: 配置 matchImage，并让您的基线保持整洁。
order: 2
reviewed: false
---

# 使用

该插件为每个 Cypress 测试添加了一条命令：`matchImage`。

## 比对某个元素或整个页面

```ts
cy.get('.an-element-of-your-choice').matchImage();

// 或者对整个页面截图
cy.matchImage();
```

## 配置一次比对

可以在每次调用 `matchImage` 时传入选项。所有选项的说明都在[配置](/docs/reference/configuration)页面：

```ts
cy.matchImage({
  // 透传给 Cypress 的截图 API
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch 选项
  diffConfig: { threshold: 0.01 },
  // 自动创建尚不存在的基线（默认：true）
  createMissingImages: false,
  // 覆盖基线：true | 'failures-only' | false（默认：false）
  updateImages: false,
});
```

## 清理未使用的图片

删除不再被任何测试使用的基线：

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

在低于 15.10 的 Cypress 版本中，请改用 `--env` 传入同一个键。

## 更多

所有选项都在[配置](/docs/reference/configuration)页面。欢迎在 [GitHub discussions](https://github.com/pixsame/pixsame/discussions) 中提问和提出想法。
