---
title: 配置
description: pixsame Cypress 插件的所有选项，支持按调用或全局设置，另含批量审查模式。
order: 1
reviewed: false
---

# 配置

所有选项既可以在每次调用 `matchImage` 时传入，也可以为整个运行全局设置。全局键名与按调用选项同名，只是加上了 `pluginVisualRegression` 前缀。

## 选项

- 以参数形式把配置传给 `matchImage` 命令：

```ts
cy.matchImage({
  // 截图配置，会直接传给 Cypress 的截图方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 默认值：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 选项，参见：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 默认值：{ includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // 是否自动创建缺失的基线图片
  // 默认值：true
  createMissingImages: false,
  // 是否自动更新图片——在 CI 中很有用
  // - true：不做比对，直接覆盖所有基线图片（最快）
  // - 'failures-only'：先比对，仅当差异超过阈值时才更新基线
  // - false：从不自动更新基线图片
  // 默认值：false
  updateImages: true,
  // 截图图片的存放目录
  // 相对路径相对于项目根目录解析
  // 支持绝对路径（unix 和 windows 系统均可）
  // 插件会根据操作系统规范化路径分隔符，您应始终使用 / 作为路径分隔符，例如 windows 盘符写法：C:/my-directory/nested
  // 路径中可以使用一个特殊变量：
  // - {spec_path}：从项目根目录到当前 spec 文件所在目录的相对路径（例如 `/src/components/my-tested-component`）
  // 默认值：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 差异阈值上限，超过即判定测试失败
  // 默认值：0.01
  maxDiffThreshold: 0.1,
  // 强制把缩放比例设为 "1"
  // 可避免在 Mac Retina 等高密度屏幕上截图被放大 2 倍
  // 默认值：true
  forceDeviceScaleFactor: false,
  // 用于给图片文件命名的标题
  // 默认值：Cypress.currentTest.titlePath（您的测试标题）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 传入一张自定义图片的路径，用它来做比对
  // 而不是与上一次运行的图片比对
  // 默认值：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 通过[全局 expose 配置](https://on.cypress.io/expose)（Cypress 15.10+）。配置键名与上面配置对象中的键相同，只是加上了 `pluginVisualRegression` 前缀，例如：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起已废弃，16 中移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

多个选项请放在同一个参数中，用逗号分隔。如果重复传入 `--expose`（或 `--env`），Cypress 只会保留最后一次出现的值。

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
// cypress.config.ts（Cypress <15.10，在更新的版本中已废弃）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

设置 expose 变量的更多方式[请参阅这里](https://on.cypress.io/expose)。

## 清理未使用的图片

把视觉回归插件生成的、已不再被任何测试使用的截图删掉是个好习惯。
通过 expose 变量开启此功能，即可释放存储空间 🚀：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起已废弃，16 中移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 批量审查模式

批量审查模式会运行整个测试套件，而不会在遇到第一个视觉差异时就停下来。失败的快照会被收集起来；在有界面（headed）模式下，运行结束后可以在一个轮播视图中逐个审查，对每条基线选择替换或跳过。这是一个全局选项，通过 `pluginVisualRegressionBatchReviewMode` 键开启（另有 `pluginVisualRegressionBatchReviewModeShowPassingImages` 可同时列出通过的图片）：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起已废弃，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

审查界面的使用方式及演示，请参阅 [Cypress 插件页面的批量审查模式一节](/products/cypress-plugin#batch-review-mode)。
