---
title: Manifest 結構
description: 不依賴特定 runner 的執行 manifest，pixsame 工具都會讀寫它。規格位於 visual-regression.dev。
order: 2
reviewed: false
---

# Manifest 結構

Manifest 是一份機器可讀的紀錄，記載測試執行期間每一次截圖比對。由視覺回歸工具負責寫入，再由 PR 留言機器人、審閱儀表板、核准工具等 CI 工具讀取。它是測試 runner 與所有下游工具之間的契約。

它是開放且不依賴特定 runner 的格式，並不綁定 pixsame。規格、欄位參考、其他 runner 的轉換器與檢視器都在開源儲存庫 [visual-regression](https://github.com/visual-regression/visual-regression) 中維護，並發佈於 [visual-regression.dev/manifest](https://visual-regression.dev/manifest)。JSON Schema、型別、reader、writer 與 merger 以 [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) 的名稱發佈到 npm。

每一個 pixsame 工具都讀寫這個格式，GitHub App 與託管平台也接受來自任何 runner 的 manifest。
