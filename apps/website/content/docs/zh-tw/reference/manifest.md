---
title: Manifest 結構
description: 每一個 pixsame 工具都會讀寫、且不依賴特定 runner 的執行 manifest。
order: 2
reviewed: false
---

# Manifest 結構

Manifest 是一份機器可讀的紀錄，記載測試執行期間每一次截圖比對。由視覺回歸工具負責寫入，再由 PR 留言機器人、審閱儀表板、核准工具等 CI 工具讀取。它是測試 runner 與所有下游工具之間的契約，並以開放標準 `visual-regression-manifest` 的形式發佈，內含 JSON Schema、型別、reader、writer 與 merger。

所有與測試 runner 相關的內容都放在 `runner` 底下，因此同一種檔案格式既能描述 Cypress 的執行，也能描述 Playwright 的執行。讀取端必須忽略它不認識的 key。

## 頂層欄位

| 欄位                     | 說明                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `version`                | 格式版本，目前為 `1`。只有在破壞性變更時才會遞增。                                                                        |
| `createdAt`, `updatedAt` | ISO 8601 時間戳記。檔案會在每次比對後重新寫入，因此即使執行中途中止，內容仍然完整。                                       |
| `projectRoot`            | 絕對路徑，manifest 中所有相對路徑都以此為基準解析。                                                                       |
| `platform`               | 執行測試的機器：`os`、`arch`，以及選填的 `osVersion`。                                                                    |
| `ci`                     | 從環境偵測到的 CI 中繼資料（`provider`、`repository`、`sha`、`branch`、`pullRequest`、`url` 等），不在 CI 中時為 `null`。 |
| `options`                | 寫入端設定的全域工具選項，使用寫入端自己的詞彙。                                                                          |
| `runner`                 | 執行測試的工具。只有 `name` 為必填。                                                                                      |
| `upload`                 | 使用上傳服務時，影像上傳的位置。                                                                                          |
| `entries`                | 每一次截圖比對對應一筆 entry。                                                                                            |

## Entries

每一筆 entry 都會記錄截圖的 `name`、所屬的 `test`、`status`、`comparison` 結果、`images` 中的路徑，以及基準影像是否已被寫入。

| 狀態               | 意義                                           |
| ------------------ | ---------------------------------------------- |
| `passed`           | 在門檻範圍內。                                 |
| `failed`           | 超過門檻。實際影像與差異影像會保留下來供審閱。 |
| `missing-baseline` | 沒有基準影像，而且工具被設定為不要建立。       |
| `created`          | 原本沒有基準影像，因此新影像成為基準影像。     |
| `updated`          | 基準影像依要求被覆寫。                         |
| `approved`         | 基準影像已從審閱介面中替換。                   |

`failed` 與 `missing-baseline` 是需要人工處理的 entry。

選填的 entry 欄位可提供更多脈絡：`platform`、`target`、`variant`（裝置、主題、語系等）、`viewport`、`renderer`，以及含有每張影像 sha256 的 `hashes`。

## 來源依據

完整的 JSON Schema 位於 [visual-regression 儲存庫](https://github.com/visual-regression/visual-regression)。本頁僅為摘要。
