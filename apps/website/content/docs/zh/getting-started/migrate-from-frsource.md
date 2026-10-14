---
title: 从 @frsource 迁移
description: 一步完成从 @frsource/cypress-plugin-visual-regression-diff 到 @pixsame/cypress-plugin-visual-regression-diff 的迁移。
order: 3
reviewed: false
---

# 从 @frsource 迁移

## 为什么要迁移包

该插件过去以 `@frsource/cypress-plugin-visual-regression-diff` 的名称发布。现在它归属于 [pixsame](https://github.com/pixsame) 组织，与开放的清单格式及生态系统中的其他项目放在一起，并以 `@pixsame/cypress-plugin-visual-regression-diff` 的名称发布。`@frsource` 包不会再发布新版本，因此要继续获得修复和新功能，您需要切换过来。

## 迁移有多简单

这只是一次重命名，别无其他改动。`@pixsame` 的首个版本（1.0.0）与 `@frsource` 的最后一个版本（4.3.0）代码完全相同，行为没有任何变化。您的基线图片、配置以及所有 `cy.*` 命令都可以原样继续使用。

## 使用 migrate 命令

`@frsource` 的最后几个版本自带一条命令，可以替您完成重命名。它会重命名当前目录下所有 `package.json` 中的依赖项，更新配置文件和 support 文件中的导入语句与类型引用，并使用它检测到的包管理器重新安装依赖：

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

它会先列出将要修改的文件，并在写入任何内容前征求您的确认。

| 参数           | 作用                             |
| -------------- | -------------------------------- |
| `--dry-run`    | 仅列出将被修改的文件             |
| `--yes`        | 跳过确认提问（在 CI 中必须使用） |
| `--no-install` | 跳过安装步骤                     |

## 想手动迁移？

替换依赖包，并把导入语句中的包名改掉即可：

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

如果您在某个 `tsconfig.json` 的 `compilerOptions.types` 中列出了该包，也请一并改名。
