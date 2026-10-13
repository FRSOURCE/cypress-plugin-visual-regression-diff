---
title: 清单 schema
description: 与运行器无关的运行清单，所有 pixsame 工具都会读写它。
order: 2
reviewed: false
---

# 清单 schema

清单（manifest）是一份机器可读的记录，包含一次测试运行中进行的每一次截图比对。视觉回归工具负责写入它，而 PR 评论机器人、审查看板、批准工具等 CI 工具负责读取它。它是测试运行器与所有下游工具之间的契约，并以开放标准 `@pixsame/manifest` 的形式发布，其中包括：一份 JSON Schema、类型定义、读取器、写入器和合并器。

所有与测试运行器相关的内容都放在 `runner` 之下，因此同一种文件既能描述一次 Cypress 运行，也能描述一次 Playwright 运行。消费方必须忽略自己不认识的键。

## 顶层字段

| 字段                     | 说明                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `version`                | 格式版本，当前为 `1`。仅在发生破坏性变更时递增。                                                                          |
| `createdAt`、`updatedAt` | ISO 8601 时间戳。每次比对后文件都会被重写，因此即使运行被中止，文件也是完整的。                                           |
| `projectRoot`            | 绝对路径，清单中的所有相对路径都相对于它解析。                                                                            |
| `platform`               | 运行测试的机器：`os`、`arch`，以及可选的 `osVersion`。                                                                    |
| `ci`                     | 从环境中检测到的 CI 元数据（`provider`、`repository`、`sha`、`branch`、`pullRequest`、`url` 等），不在 CI 中时为 `null`。 |
| `options`                | 配置的全局工具选项，使用写入方自己的术语。                                                                                |
| `runner`                 | 运行测试的工具。只有 `name` 是必填项。                                                                                    |
| `upload`                 | 使用了上传服务时，图片被上传到的位置。                                                                                    |
| `entries`                | 每次截图比对对应一个条目。                                                                                                |

## 条目

每个条目记录截图的 `name`、它所属的 `test`、一个 `status`、`comparison` 结果、`images` 中的各个路径，以及基线是否被写入。

| 状态               | 含义                                               |
| ------------------ | -------------------------------------------------- |
| `passed`           | 差异在阈值之内。                                   |
| `failed`           | 差异超过阈值。实际截图和差异图片会被保留以供审查。 |
| `missing-baseline` | 不存在基线，且工具被配置为不自动创建。             |
| `created`          | 原本不存在基线，因此新图片成为了基线。             |
| `updated`          | 基线按要求被覆盖。                                 |
| `approved`         | 基线通过审查界面被替换。                           |

`failed` 和 `missing-baseline` 是需要人工处理的条目。

条目还有一些可选字段用于补充上下文：`platform`、`target`、`variant`（设备、主题、语言区域等）、`viewport`、`renderer`，以及包含每张图片 sha256 的 `hashes`。

## 权威来源

完整的 JSON Schema 位于 [pixsame 仓库](https://github.com/pixsame/pixsame/tree/main/packages/visual-regression-manifest)。本页只是摘要。
