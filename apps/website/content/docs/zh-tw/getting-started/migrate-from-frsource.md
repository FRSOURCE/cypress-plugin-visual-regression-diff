---
title: 從 @frsource 遷移
description: 一步就能從 @frsource/cypress-plugin-visual-regression-diff 換到 @pixsame/cypress-plugin-visual-regression-diff。
order: 3
reviewed: false
---

# 從 @frsource 遷移

## 套件為什麼搬家

這個外掛過去以 `@frsource/cypress-plugin-visual-regression-diff` 的名稱發佈。現在它和 manifest 標準以及整個生態系的其他部分一起放在 [pixsame](https://github.com/pixsame) 組織底下，並以 `@pixsame/cypress-plugin-visual-regression-diff` 發佈。`@frsource` 套件不會再有新版本，若要持續取得修正與新功能，您需要切換過來。

## 有多簡單

就只是改個名字，其他什麼都沒變。第一個 `@pixsame` 版本（1.0.0）與最後一個 `@frsource` 版本（4.3.0）是同一份程式碼，行為完全相同。您的基準影像、設定以及每一個 `cy.*` 指令都可以原封不動地繼續使用。

## 使用 migrate 指令

最後幾個 `@frsource` 版本內建了一個指令，可以替您完成更名。它會把目前目錄下所有 `package.json` 中的相依套件改名、更新您 config 與 support 檔案中的 import 與型別參照，然後用它偵測到的套件管理工具重新安裝：

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

它會先列出將要修改的檔案，並在寫入任何內容前先詢問您。

| 旗標           | 作用                       |
| -------------- | -------------------------- |
| `--dry-run`    | 只列出會被修改的檔案       |
| `--yes`        | 略過詢問（在 CI 中為必要） |
| `--no-install` | 略過安裝步驟               |

## 想自己手動處理？

更換套件，並把 import 中的名稱替換掉：

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

如果您在某個 `tsconfig.json` 的 `compilerOptions.types` 中列出了這個套件，也請一併改名。
