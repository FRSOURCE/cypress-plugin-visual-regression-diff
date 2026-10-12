---
reviewed: false
source: 3d5b703737db7cd3
---

## 快速开始

### 安装

您可以使用自己常用的包管理器安装本库：

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

接下来，需要在两处引入本库：

- 首先，在 support 文件中（默认位于 `cypress/support/index.js`）：

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- 其次，在 `cypress.config.js`（或 `cypress.config.ts`）中：

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin 必须在实际使用它的配置块（e2e 或 component）中调用
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

就这么简单。接下来请看[用法](#usage)一节，了解如何使用本库。

## 用法

安装完成后，在测试中这样写即可使用：

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

如果想对整个页面截图：

```ts
cy.matchImage();
```

`matchImage` 命令会截取一张截图，并与上一次运行生成的图片进行比对。一旦出现回归，测试将失败，并显示一个「See comparison」按钮，点击即可查看问题所在。

## 示例

安装时仍有问题？可以看看[本仓库的 examples 目录](https://github.com/pixsame/pixsame/tree/main/examples)，了解如何在您项目的 Cypress e2e 测试或组件测试环境中使用本插件。

## 自动清理未使用的图片

视觉回归插件生成的截图中，有些可能已经不再被任何测试使用，把它们清理掉会很有用。
通过 expose 变量开启此功能，即可释放存储空间 🚀：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## 配置

插件可以通过以下方式配置：

- 将配置对象作为参数传给 `matchImage` 命令：

```ts
cy.matchImage({
  // 截图配置，会原样传给 Cypress 的 screenshot 方法：https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // 默认值：{ }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch 选项，参见：https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // 默认值：{ includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // 基线图片缺失时是否自动创建
  // 默认值：true
  createMissingImages: false,
  // 是否自动更新图片——在 CI 中很有用
  // - true：不做比对，直接覆盖所有基线图片（最快）
  // - 'failures-only'：先比对，仅当差异超过阈值时才更新基线
  // - false：从不自动更新基线图片
  // 默认值：false
  updateImages: true,
  // 存放截图的目录路径
  // 相对路径以项目根目录为基准解析
  // 支持绝对路径（unix 和 windows 系统均可）
  // 插件会根据操作系统对路径分隔符做规范化，请始终使用 / 作为分隔符，例如 windows 盘符写法：C:/my-directory/nested
  // 路径中可以使用一个特殊变量：
  // - {spec_path} - 从项目根目录到当前 spec 文件所在目录的相对路径（例如 `/src/components/my-tested-component`）
  // 默认值：'{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // 差异超过该阈值时测试失败
  // 默认值：0.01
  maxDiffThreshold: 0.1,
  // 强制将缩放比例设为 "1"
  // 可解决在 Mac Retina 等高分屏上截图被放大 2 倍的问题
  // 默认值：true
  forceDeviceScaleFactor: false,
  // 用于生成图片文件名的标题
  // 默认值：Cypress.currentTest.titlePath（即您的测试标题）
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // 指定一张自定义图片的路径用于比对
  // 而不是与上一次运行生成的图片进行比对
  // 默认值：undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- 通过[全局 expose 配置](https://on.cypress.io/expose)（Cypress 15.10+）。配置键名与上面配置对象的键名相同，只是加上了 `pluginVisualRegression` 前缀，例如：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

多个选项请放在同一个参数里，用逗号分隔。如果 `--expose`（或 `--env`）重复出现，Cypress 只会保留最后一个。

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
// cypress.config.ts（Cypress <15.10，新版本中已弃用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

更多设置 expose 变量的方式[请参考这里](https://on.cypress.io/expose)。

## 批量审查模式

批量审查模式（Batch Review Mode）让您可以完整跑完整个测试套件，而不会在第一个视觉差异失败处停下。所有失败的快照会被收集起来，在测试结束后通过一个交互式审查界面展示——您可以批量通过或跳过这些变更。

### 有头模式（非 CI 环境）下的额外功能

启用后，Cypress 测试运行器右下角会出现一个悬浮操作按钮（FAB）。测试运行过程中：

- 每当某次 `matchImage()` 调用的差异超过阈值，FAB 上的计数徽标会加一，而不是立即抛出错误。
- 所有测试结束后，会抛出一个包含失败总数的错误。
- 点击 FAB 会打开一个轮播面板，您可以逐一并排审查每个失败的快照（新图 vs 旧图），然后选择**替换**基线或**跳过**该变更。

![批量审查模式演示](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> 注意：批量模式将在下一个主版本中成为默认行为。如需保留旧行为，请务必将该配置项设为 `false`（详见下文）。

### 如何启用

批量审查模式是一个全局选项（不能直接传给 `matchImage`）。通过 `pluginVisualRegressionBatchReviewMode` 键启用：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

```ts
// cypress.config.ts（Cypress <15.10，新版本中已弃用）
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### 审查已通过的图片

与基线有差异但仍在 `maxDiffThreshold` 范围内的图片不会导致测试失败，但同样会被收集。轮播面板中有一个 **Show passing** 复选框，勾选后即可浏览这些图片（每张都带有 `passed` 标记），并同样可以替换它们的基线，例如用来消除逐渐累积的细微偏差。

该复选框默认不勾选。可通过 `pluginVisualRegressionBatchReviewModeShowPassingImages` 键将其设为默认勾选：

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true,pluginVisualRegressionBatchReviewModeShowPassingImages=true"
```

```ts
// cypress.config.ts（Cypress 15.10+）
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
    pluginVisualRegressionBatchReviewModeShowPassingImages: true,
  },
});
```

在运行器中切换该复选框的状态会记录在浏览器的 local storage 中，后续运行时将优先于配置中的值。

## 常见问题

### 为什么截图与我 Cypress 配置中设置的 `viewport` 不一致？

Cypress 的截图默认不会按视口尺寸裁剪。您可以这样修改此行为：

- 全局修改，更改默认截图配置：`Cypress.Screenshot.defaults({ capture: 'viewport' });`
- 局部修改，将截图配置直接传给 `.matchImage` 命令：`cy.matchImage({ screenshotConfig: { capture: 'viewport' } });`

### 升级本插件版本后，我所有的基线图片都被自动更新了，这是为什么？

有时我们需要对图片比对或图片生成算法做破坏性变更。为了让您的升级过程尽可能顺畅，插件会自动更新您的基线图片。升级插件后，只需把这些图片提交到仓库即可！

### `cypress run` 和 `cypress open` 生成的截图不一样，该怎么解决？

这通常是无头模式和有头模式之间设备像素比（device pixel ratio）不同导致的。使用 `forceDeviceScaleFactor` 选项将缩放比例统一为 `1`：

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

或者通过 expose 变量全局设置：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

如果视口尺寸差异持续存在，可以考虑在 `setupNodeEvents` 中显式设置浏览器窗口大小：

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.name === 'chrome' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

### 如何与其他同样在 `setupNodeEvents` 中注册事件的 Cypress 插件一起使用？

Cypress 每个事件只支持一个处理函数。如果多个插件注册了同一个事件（例如 `after:screenshot`），只有最后注册的那个会被调用。要安全地组合多个插件，请使用 [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix)：

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // 在此处使用 fixedOn 注册其他插件
    },
  },
});
```

### 如何与 mochawesome 或其他会内嵌截图的报告工具集成？

本插件将基线图片存放在默认的 `cypress/screenshots/` 目录之外。而有些报告工具（如 `cypress-mochawesome-reporter`）要求截图位于该目录下。

可以使用 `processImgPath` task 钩子控制截图文件的存放位置。在 `setupNodeEvents` 中调用 `initPlugin` 之后覆盖它：

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // 覆盖路径处理函数，让报告工具能够访问到截图
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // 返回一个新路径；返回原路径则保持默认行为
      return path;
    },
  });
}
```

### 如何让任何视觉差异（无论多小）都导致测试失败？

将 `maxDiffThreshold` 设为 `0`：

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

或者通过 expose 变量全局设置：

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10（15.10 起已弃用，16 中移除）
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

### 为什么图片比对成功后实际截图会被删除？

当图片匹配时，`.actual.png` 文件只是临时文件，比对完成后会被清理，只保留基线图片（无后缀）。这样可以避免存储冗余文件。

当图片不匹配时，`.actual.png` 文件会被保留，并且携带与基线图片相同的插件元数据。您可以放心地将它重命名或复制覆盖到基线图片上（例如在 CI 任务中用更新后的基线创建一个 Pull Request）——插件会将其视为最新的基线，下次运行时不会重新生成。

如果您需要让实际截图对报告工具（例如 `cypress-mochawesome-reporter`）保持可访问，请使用 `processImgPath` task 钩子来控制截图的存放位置。参见[如何与 mochawesome 或其他会内嵌截图的报告工具集成？](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

### 如何去掉截图文件名中的空格？

截图文件名来自 Cypress 测试标题，其中可能包含空格。如果想使用不含空格的文件名，可以在每次调用 `matchImage` 时传入自定义的 `title` 选项：

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

如需对所有 `matchImage` 调用全局生效，可以在 support 文件（`cypress/support/commands.ts`）中覆盖该命令：

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

### 如何在图片文件名中包含浏览器名称（用于跨浏览器测试）？

不同浏览器对字体和元素的渲染可能略有差异。要为每个浏览器单独保存基线图片，可以在 support 文件（`cypress/support/commands.ts`）中覆盖 `matchImage`，设置一个与浏览器相关的 `imagesPath`：

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

这样每个浏览器都会有独立的图片目录（例如 `__image_snapshots__/chrome/`、`__image_snapshots__/firefox/`）。

### 如何生成一份同时展示基线、差异和实际截图的 HTML 报告？

本插件在 Cypress 界面中内置了视觉比对浮层——在失败的测试上点击「See comparison」，即可并排查看基线、差异和实际截图。

如需用于 CI 或便于分享的 HTML 报告，可以与 [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter) 之类的报告工具集成。配置细节参见[如何与 mochawesome 或其他会内嵌截图的报告工具集成？](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)。
