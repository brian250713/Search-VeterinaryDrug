# Design

## Context

修改動機見 proposal.md — Why。

與實作相關的現況事實（皆已於 `dist/` 實測確認）：

- 導覽列與網站標誌都在 `src/layouts/Layout.astro:33-47`，全站共用同一份結構，因此這個修正對所有頁面同時生效。
- `src/styles/global.css` 目前沒有任何 media query；`src/` 整個目錄唯一的 media query 在 `src/pages/index.astro:168`（搜尋頁篩選面板收合），且限定 `max-width: 768px`。本 change 會寫入 `global.css` 的第一個 media query。
- 390px 視窗下的實測 bounding box：`.site-logo` 為 97×64，5 個 `.nav-links a` 各為 33×49。連結文字是折行（2×2 字）而非被裁切——flex item 的 `min-width: auto` 使其不會被壓到低於 min-content。
- `body { overflow-x: hidden }`（`global.css:31`）使「頁面沒有水平捲動」在任何內容寬度下都成立，因此該條件無法作為回歸防線。
- `vitest.config.ts` 為 `environment: 'node'`，未安裝 jsdom／happy-dom；`tests/` 下無任何 layout 相關測試。

375px 的寬度預算：`.header-inner` 左右各 1rem padding，內容可用寬度 375 − 32 = 343px。`.nav-links` 若 `gap` 為 0.5rem（8px），5 個 4 字連結各需 4 × 15.2 = 60.8px，合計 5 × 60.8 + 4 × 8 = 336px，可容納於 343px。

## Goals / Non-Goals

**Goals:**

- 375px 下 5 個導覽連結的標籤各自單行顯示，不折行、不裁切。
- `.site-logo` 不再因 flex 壓縮而折行。
- 桌面版（> 480px）排版與目前完全一致。
- 未來新增第 6 個導覽連結時不會重新引發水平溢出。
- 讓「375px 導覽列可用」這個條件變成真的會失敗。

**Non-Goals:**

- 不做漢堡選單／導覽收合面板。spec 明確要求「完整顯示所有連結」，改成收合會與該字面衝突，需要先改 spec。
- 不移除 `body { overflow-x: hidden }`。移除會讓全站其他未處理的溢出（卡片網格、長公司名稱、表格）全部暴露成可捲動，遠超本 change 範圍。此決定改以 spec 條款約束：該屬性 MUST NOT 被當作達成 375px 條件的證據。
- 不為 `drug-search` 與 `drug-comparison` 的 375px 需求新增 delta；兩者已由 `index.astro:167-182` 與 `compare.astro:77-101` 滿足。
- 不引入 Playwright 或任何新 devDependency。

## Decisions

### D1. 用 media query 讓 header 換列，而非單純依賴 `flex-wrap`

375px 下 header 需要 153px（標誌）+ 16px（gap）+ 導覽列寬度。即使標誌不壓縮，導覽列只剩 230px，每連結 39px < 60.8px 仍會折行。因此只加 `flex-wrap: wrap` 到 `.nav-links`（archived change `2026-09-24-add-company-overview` design.md D3 的原始建議）不足以達成需求，必須讓 `.header-inner` 在窄螢幕換列，使導覽列取得整列 343px。

替代方案：把 `max-width` 降到 480px 之外的值、或直接縮小字級。放寬斷點到 600px 以上不影響 375px 目標但會在平板竪屏也換列，屬未經驗證的行為改變，不採用。

### D2. 斷點定在 480px

`.nav-links` 需要 336px、`.header-inner` 需要 368px 才不換列。375px 是 iPhone SE/8 的寬度，360px 是常見 Android 寬度。480px 斷點涵蓋兩者，並讓 414px（iPhone 11）以下一致換列。

替代方案 375px 斷點：375px 裝置本身恰在邊界，量測誤差就會翻轉排版。480px 有足夠緩衝。

### D3. `.site-logo` 修 `flex-shrink` 而非放棄標誌

實測標誌被壓到 97px 寬、64px 高（自然寬度約 153px），文字折成兩行。這是獨立於導覽連結的缺陷，即使 nav 完全修好仍會存在。加 `flex-shrink: 0` 與 `white-space: nowrap` 讓標誌保持完整，讓換列由 D1 的 media query 單獨處理。

替代方案：在窄螢幕隱藏標誌文字只留 emoji。可行但犧牲品牌識別，且與「完整顯示」的整體語意不一致，不採用。

### D4. 保留 `flex-wrap: wrap` 作為新增連結的防禦

D1 之後 375px 下導覽列剛好容納 5 連結（336 ≤ 343），緩衝僅 7px。第 6 個連結會溢出。`flex-wrap: wrap` 使這種情況退化成多列排列而非水平溢出，且 `flex-wrap` 在 > 480px 時不會改變任何排版（內容本來就放得下）。

### D5. 窄螢幕導覽列改為靠左對齊

`.header-inner` 使用 `justify-content: space-between`。換列後單一 item 的列會靠左對齊，視覺上與上一列的標誌對齊。media query 內明確設定 nav 的 `justify-content`，避免依賴預設行為。

## Risks / Trade-offs

- [在 360px 裝置上導覽列仍會排成兩列] → 這是 D4 設計的預期行為，連結標籤仍各自單行，spec 允許多列。不是回歸。
- [`global.css` 從零 media query 變成有 media query，未來開發者可能在此追加更多響應式規則] → 這是本 change 的正面副作用；原本只有 `index.astro` 單頁有響應式處理是缺陷而非狀態。
- [375px 條件仍無法自動測試] → 已於 spec 以「MUST NOT 將頁面容器設定為水平溢出隱藏來達成此條件」與「連結標籤 MUST 單行」收緊，但真正的驗收仍需瀏覽器實測。加自動化的選項（Playwright）列在 Non-Goals。
- [移除 header 壓縮可能在 320px 等極窄視窗讓導覽列佔用較多垂直空間] → 375px 與 360px 為目標範圍；320px 沿用既有行為品質，未特別驗證。