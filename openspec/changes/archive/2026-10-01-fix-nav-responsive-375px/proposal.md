# Proposal

## Why

`company-browse` 的「導覽列公司總覽入口」需求要求在 375px 寬度下導覽列不得造成水平捲動，但實測顯示共用 header 在窄螢幕上把網站標誌壓成兩行、把 5 個導覽連結各壓成 2×2 字的折行方塊，header 高度從 40px 膨脹到 64px，視覺上等同導覽列失效。

更根本的問題是這條 MUST 目前無法失敗：`src/styles/global.css` 的 `body { overflow-x: hidden }` 保證頁面在任何內容寬度下都不會有水平捲動，因此「不造成頁面水平捲動」恆為真，無法作為回歸防線。加上 `global.css` 至今沒有任何 media query，這個缺口沒有任何機制會被察覺。

## What Changes

- `src/styles/global.css` 的 `.site-logo` 不再被壓縮（`flex-shrink: 0` 與 `white-space: nowrap`），修掉獨立於導覽連結之外的品牌區塊折行。
- `src/styles/global.css` 的 `.nav-links` 允許連結排列為多列（`flex-wrap: wrap`），並縮小間距（`gap: 1rem` → `0.5rem`），使連結標籤在 375px 下維持單行。
- `src/styles/global.css` 新增第一個 media query（`max-width: 480px`），讓 `.header-inner` 在窄螢幕換列，讓導覽列取得整列寬度。
- `company-browse` 的「導覽列公司總覽入口」需求改寫為可失敗的條件：連結標籤 MUST 保持單行顯示，MUST NOT 逐字折行或被裁切；寬度不足時導覽列 MAY 排列為多列。

不涉及 breaking change：所有新增行為僅在視窗寬度 ≤ 480px 時生效。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `company-browse`: 「導覽列公司總覽入口」需求的可驗證條件修正。原本僅要求「不造成頁面水平捲動」，該條件被 `body { overflow-x: hidden }` 恆真滿足；新條件要求導覽連結標籤保持單行且不被裁切。

## Impact

- **修改檔案**：`src/styles/global.css`（`.site-logo`、`.nav-links`、新增 `@media (max-width: 480px)` 區塊）。
- **修改規格**：`openspec/specs/company-browse/spec.md`（經 delta spec 同步）。
- **未受影響**：HTML 結構、JS、資料處理、build script、依賴。
- **跨 spec 效益**：`drug-search` 與 `drug-comparison` 同樣帶有 375px 需求且已由各自頁面的 media query 與 `.table-responsive` 滿足，本 change 不修改該兩者，但 header 修復對所有頁面生效。
- **驗證限制**：repo 的 `vitest.config.ts` 使用 `environment: 'node'` 且未安裝 jsdom／happy-dom，layout 相關性質無法自動測試；本 change 的驗收以瀏覽器實測為準。