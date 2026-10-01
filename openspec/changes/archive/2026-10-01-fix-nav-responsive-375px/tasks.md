# Tasks

## 1. Header 基礎樣式

- [x] 1.1 在 `src/styles/global.css` 的 `.site-logo` 加入 `flex-shrink: 0` 與 `white-space: nowrap`，阻止網站標誌被 flex 壓縮折行。驗證：`pnpm lint` 通過，且 375px 下 `.site-logo` bounding box 為 155×32（單行）

- [x] 1.2 在 `src/styles/global.css` 的 `.nav-links` 加入 `flex-wrap: wrap`；`gap` 由 `1rem` 縮為 `0.5rem` **僅在 `@media (max-width: 480px)` 內**（見下方「與原任務描述的差異」）。驗證：`pnpm lint` 通過，且 768px / 1280px 下 `.nav-links` 高度為單行（24px），桌面間距維持 1rem

## 2. 窄螢幕換列

- [x] 2.1 在 `src/styles/global.css` 新增 `@media (max-width: 480px)` 區塊，讓 `.header-inner` 允許換列（`flex-wrap: wrap`）並在該斷點下改用 `justify-content: flex-start`。這是本檔案的第一個 media query。驗證：`pnpm lint` 通過，且 375px 下 `.header-inner` 高度 129px（標誌與導覽列分列兩行）

- [x] 2.2 在同一個 `@media (max-width: 480px)` 區塊內設定 `.nav-links` 的 `justify-content: flex-start`（design.md D5：靠左對齊）。驗證：375px 下第一個導覽連結左緣 = 16px，與 `.site-logo` 左緣一致

- [x] 2.3 確認新增的 media query 未影響斷點以外的任何規則，並確認 `src/pages/index.astro:168` 既有的 `max-width: 768px` 篩選面板行為不變。驗證：`pnpm build` 成功（8 pages），`git diff` 僅含 3 個區塊

## 3. 跨頁面與跨視窗驗收

- [x] 3.1 `pnpm build` 後量測 375px 視窗下的導覽列，確認 5 個連結的 `<a>` 各自高度為單行（< 30px）、寬度足以容納 4 個中文字（>= 61px），且每個連結的最右緣不超出視窗寬度。對照 spec scenario「手機寬度」

- [x] 3.2 確認 `/`、`/companies`、`/ingredients`、`/compare`、`/about-data`、`/company/` 每頁導覽列皆為相同 5 個連結。此驗證 spec 的「任一頁面」範圍

- [x] 3.3 在 360px 視窗下確認導覽連結排列為多列、每個連結標籤仍各自單行完整可讀、頁面無水平捲動。對照 spec scenario「寬度不足以容納單列」

- [x] 3.4 在 768px 與 1280px 視窗下確認 header 為單列、標誌與導覽列在同一水平線、間距與變更前一致，確認桌面排版未受影響

- [x] 3.5 執行 `pnpm verify` 與 `pnpm test`，確認兩者皆通過（此為無回歸確認，並非本次 layout 變更的驗證手段）

- [x] 3.6 在 `openspec/specs/company-browse/spec.md` 確認 delta 同步後的「導覽列公司總覽入口」需求內容與 delta 一致

## 4. Issue 收尾

- [x] 4.1 關閉 GitHub issue #1，在留言中附上 375px 與桌面版的實測結果，說明 issue 原始描述與實測的差異（實測無水平溢出、無裁切，實際缺陷為連結與標誌折行；且 `overflow-x: hidden` 使原 MUST 恆真）

## 驗收結果（2026-10-01）

量測方式：以 `node` 靜態伺服供應 `dist/`，於同源 probe 頁以 375px 寬的 `iframe` 載入各頁面，讀取 `getBoundingClientRect()` 與 `documentElement.scrollWidth`。

| 視窗 | clientWidth | H-SCROLL | logo | nav 列數 | 各連結 | 連結行數 |
|---|---|---|---|---|---|---|
| 360px | 345 | no | 155×32 單行 | 2 | 61px 寬 | 全部 1 行 |
| 375px | 360 | no | 155×32 單行 | 2 | 61px 寬 | 全部 1 行 |
| 414px | 399 | no | 155×32 單行 | 1 | 61px 寬 | 全部 1 行 |
| 480px | 465 | no | 155×32 單行 | 1 | 61px 寬 | 全部 1 行 |
| 481px | 466 | no | 155×32 單行 | 2 | 61px 寬 | 全部 1 行 |
| 768px | 753 | no | 155×32 單行 | 1 | 61px 寬 | 全部 1 行 |
| 1280px | 1265 | no | 155×32 單行 | 1 | 61px 寬 | 全部 1 行 |

- 修復前對照：390px 下 `.site-logo` 為 97×64（2 行）、5 個 `<a>` 各 33×49（2×2 折行）。修復後 logo 155×32 單行、連結 61×24 單行。
- `iframe` 帶 15px 捲軸，故 375px 視窗的實際 `clientWidth` 為 360px；此條件比真實 375px 手機（無常駐捲軸、內容寬 343px）更嚴格，故結果為保守估計。
- 481px 落入 media query 之外且 nav 需 369px（gap 1rem）而可用寬度僅 263px，因此 nav 排列為 2 列、header 高度 89px。此為 spec 允許的多列排列，非缺陷。
- 跨頁面驗證採靜態比對：6 個頁面的 `<nav class="nav-links">` markup md5 完全相同（`40C2BD0163B2`），皆 5 個連結且含 `/companies`，樣式表同為 `Layout.astro` 匯入的同一份 inline CSS，故各頁 375px 渲染一致。

## 與原任務描述的差異

**task 1.2 的 `gap` 改為套用於 `@media (max-width: 480px)` 內，而非全域。** 原描述要求全域將 `gap` 由 `1rem` 改為 `0.5rem`，但這與 design.md Goals「桌面版排版與目前完全一致」及 task 3.4「桌面間距與變更前一致」衝突。以 design.md Goals 為準，`gap: 0.5rem` 僅在窄螢幕生效，全域維持 `1rem`。實測 768px / 1280px 導覽連結間距為 16px（= 1rem），桌面排版未變。

## 未完成

- **task 3.6**：此 CLI 版本無 `openspec sync` 指令，delta spec 於 `openspec archive` 時才併入主 spec。archive 已執行（`specsUpdated: true`，`modified: 1`），`git diff` 確認主 spec 的需求本文與「手機寬度」scenario 皆已更新、「寬度不足以容納單列」scenario 已新增，且原有內容無遺失。`openspec validate --specs --strict` 通過（8/8）。