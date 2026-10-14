---
title: 清单 schema
description: 与运行器无关的运行清单，pixsame 工具都会读写它。规范位于 visual-regression.dev。
order: 2
reviewed: false
---

# 清单 schema

清单（manifest）是一份机器可读的记录，包含一次测试运行中进行的每一次截图比对。视觉回归工具负责写入它，而 PR 评论机器人、审查看板、批准工具等 CI 工具负责读取它。它是测试运行器与所有下游工具之间的契约。

它是一种开放的、与运行器无关的格式，并不绑定 pixsame。规范、字段参考、其他运行器的转换器和查看器都在开源仓库 [visual-regression](https://github.com/visual-regression/visual-regression) 中维护，并发布在 [visual-regression.dev/manifest](https://visual-regression.dev/manifest)。JSON Schema、类型定义、读取器、写入器和合并器以 [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) 的名称发布到 npm。

每个 pixsame 工具都读写这种格式，GitHub App 和托管平台也接受来自任何运行器的清单。
