## Why

目前每張許可證、每個成分都預先產生一個靜態頁面，共約 16,400 頁（藥品 13,737、成分 2,694）。本機完整建置要 13 分 22 秒，其中 721 秒花在產生靜態頁面，平均每頁 43ms，`dist/` 共 372MB。每週一次的 CI 部署因此又慢又重。這個網站不依賴搜尋引擎導流，SEO 不是需求，只需要詳情頁連結能直接分享。所以把詳情頁改成「單一殼頁加瀏覽器端讀資料渲染」，就能把建置降到一分鐘以內。

## What Changes

- **BREAKING**：產品詳情頁網址由 `/drug/<slug>` 改為 `/drug/?id=<slug>`，改為單一殼頁，由瀏覽器端讀取資料後渲染。回應狀態維持 200，連結可直接分享。
- **BREAKING**：成分頁網址由 `/ingredient/<slug>` 改為 `/ingredient/?slug=<slug>`，同樣改為單一殼頁加瀏覽器端渲染。
- 新增產品資料分片：建置時以共用的雜湊函式把產品依 slug 分到 128 個 JSON 分片（`/data/drug/NNN.json`）。前端用同一個函式算出要讀哪一片。
- 新增成分資料分片：每個成分的產品摘要依成分 slug 分片（`/data/ingredient/NNN.json`），供成分頁分組與篩選使用。
- 比較頁改為只讀取所選產品所在的分片，並移除一次下載 12MB 的 `compare-data.json`。
- 修正成分 slug 撞名：目前有 123 個 slug 對應到多個成分名稱（例如 `tylosin` 同時對應「TYLOSIN」與「TYLOSIN ，按乾燥品計算，每」），後產生的頁面會覆蓋先產生的。改為依 slug 合併成同一個成分。
- 修正部署路徑：`astro.config.mjs` 的 `site` 帶有 `/Search-VeterinaryDrug` 路徑但沒有設定 `base`，全站以 `/` 開頭的絕對連結與資料網址在 GitHub Pages 專案網址下會 404。改為設定 `base`，所有連結與 `fetch` 一律加上 base 前綴。
- 新增 `escapeHtml()`，瀏覽器端以字串組 HTML 的地方（搜尋、比較、詳情、成分頁）一律先跳脫資料欄位，補上改用 `innerHTML` 後失去的 Astro 自動跳脫。
- 詳情頁與成分頁新增「載入中」、「找不到」、「載入失敗」三種狀態，並依資料動態設定頁面標題。
- 建置驗證腳本改為檢查分片內容，不再檢查每個產品各自的 HTML 檔。
- 已知取捨：搜尋引擎無法收錄個別產品與成分；在 LINE、Facebook 等處貼上連結時，預覽卡只會顯示網站通用標題，不會顯示藥品名稱。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `product-detail`：網址格式改為 `/drug/?id=<slug>`，改由瀏覽器端渲染；新增載入中、找不到、載入失敗的狀態要求，以及動態頁面標題。
- `ingredient-browse`：網址格式改為 `/ingredient/?slug=<slug>`，改由瀏覽器端渲染；成分 slug 必須唯一，撞名的成分名稱合併為同一成分；新增找不到與載入失敗的狀態要求。
- `drug-comparison`：比較表中的產品與成分連結改用新網址格式；網址中無效 slug 的判定改以分片查詢結果為準。

## Impact

- 頁面：`src/pages/drug/[slug].astro` 改為 `src/pages/drug/index.astro`，`src/pages/ingredient/[slug].astro` 改為 `src/pages/ingredient/index.astro`；`index.astro`、`compare.astro`、`ingredients.astro`、`Layout.astro` 的連結與資料網址都要調整。
- 腳本：`scripts/normalize.ts`（成分 slug 合併、停止輸出 `compare-data.json`）、`scripts/build-search-index.ts` 或新的分片腳本、`scripts/verify-release.ts`。
- 新增共用模組：`src/lib/shard.ts`（雜湊與分片路徑）、`src/lib/escape-html.ts`。
- 設定：`astro.config.mjs` 新增 `base`。
- 建置產出：HTML 從約 16,400 頁降到約 6 頁；新增約 128 + 64 個 JSON 分片；移除 `compare-data.json`（12MB）。
- 前置條件：`add-vet-drug-search-site` 已完成（65/65）但尚未歸檔，`openspec/specs/` 目前是空的。本變更的差異規格是修改那三個 spec，因此必須先歸檔 `add-vet-drug-search-site`。
- 相依套件：不新增。
