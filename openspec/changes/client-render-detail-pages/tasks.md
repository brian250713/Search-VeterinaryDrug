## 0. 前置作業

- [x] 0.1 歸檔 `add-vet-drug-search-site`（`openspec archive add-vet-drug-search-site`），確認 `openspec/specs/` 下出現 `product-detail`、`ingredient-browse`、`drug-comparison`
- [x] 0.2 在 CI 上記錄改動前的基準：`astro build` 耗時（13 分 22 秒）、`dist/` 檔案數（16,400+ HTML 頁面）

## 1. 共用模組

- [x] 1.1 新增 `src/lib/shard.ts`：`fnv1a32()`、`shardOf(key, count)`、`shardPath(kind, n)`，以及常數 `DRUG_SHARDS = 128`、`INGREDIENT_SHARDS = 64`
- [x] 1.2 新增 `src/lib/escape-html.ts`：跳脫 `& < > " '`
- [x] 1.3 新增 `src/lib/url.ts`：`withBase()`、`drugUrl(slug)`、`ingredientUrl(slug)`、`dataUrl(path, version)`
- [x] 1.4 撰寫單元測試：固定數組 slug 對應的分片編號（防止雜湊結果漂移）、`escapeHtml` 各特殊字元、`drugUrl`／`ingredientUrl` 會編碼特殊字元並加上 base

## 2. 資料處理（normalize 與分片）

- [x] 2.1 `normalize.ts` 的成分彙總改為以 slug 為 key 合併：標準名稱取產品數最多、同數取最短；其他名稱放入 `aliases`；`verified` 取 OR；產品數以產品去重後計算
- [x] 2.2 `ProductIngredient` 型別新增 `slug` 欄位，`normalize.ts` 產出產品時填入
- [x] 2.3 撰寫測試：`TYLOSIN` 與 `TYLOSIN ，按乾燥品計算，每` 合併成一個成分；同一產品含兩種寫法時只計算一次；`ingredients.json` 中沒有重複的 slug
- [x] 2.4 新增 `scripts/build-shards.ts`：清空 `public/data/drug/` 與 `public/data/ingredient/`，依 `shardOf` 輸出產品分片 `{ [slug]: Product }` 與成分分片 `{ [slug]: { ingredient, products: ProductSummary[] } }`；成分分片只收一般藥品，`ProductSummary` 欄位依 design D3
- [x] 2.5 `package.json` 的 `normalize` 指令鏈加入 `build-shards.ts`；`normalize.ts` 停止輸出 `compare-data.json`，並刪除 `public/data/compare-data.json` 與 `data/compare-data.json`
- [x] 2.6 執行 `pnpm normalize`，確認分片數量、單片大小（產品分片 gzip 後約 20KB 等級），並記錄在 build log

## 3. base path 與既有頁面連結

- [x] 3.1 `astro.config.mjs` 設定 `base: '/Search-VeterinaryDrug'`
- [x] 3.2 `Layout.astro` 的導覽列連結改用 `withBase()`
- [x] 3.3 `index.astro`：`fetch` 搜尋索引改用 `dataUrl()`；結果中的產品與成分連結改用 `drugUrl()`、`ingredientUrl(ing.slug)`；所有插入的資料欄位加上 `escapeHtml()`；`<script is:inline>` 改為模組 script 以便 import 共用模組
- [x] 3.4 `ingredients.astro`：成分連結改用 `ingredientUrl()`
- [x] 3.5 搜尋全站確認沒有殘留以 `/drug/`、`/ingredient/`、`/data/`、`/compare` 開頭且未經 base 處理的連結或 `fetch`

## 4. 產品詳情頁（product-detail）

- [x] 4.1 刪除 `src/pages/drug/[slug].astro`，新增 `src/pages/drug/index.astro` 殼頁：包含骨架畫面、`<noscript>` 說明、通用的 `og:title`／`og:description`
- [x] 4.2 把原本的模板改寫成 `renderProduct(product): string`，保留原有 HTML 結構與 class，所有欄位經過 `escapeHtml()`，沿用 `display-helpers.ts`
- [x] 4.3 實作狀態流程：讀取 `id` → 用 `shardOf` 算出分片 → `fetch` → 依結果切換 loading / notFound / error / ready；error 狀態附重新載入按鈕
- [x] 4.4 ready 狀態設定 `document.title` 為「<中文品名> (<許可證字號>) - 動物用藥資訊」
- [x] 4.5 「加入比較」按鈕改為在渲染完成後綁定，行為與原本一致
- [x] 4.6 撰寫 `renderProduct` 的測試：失效產品顯示警示、空白欄位顯示「未載明」、蛋雞限制以警示樣式顯示、品名含 `<script>` 時以純文字輸出

## 5. 成分頁（ingredient-browse）

- [x] 5.1 刪除 `src/pages/ingredient/[slug].astro`，新增 `src/pages/ingredient/index.astro` 殼頁
- [x] 5.2 依 `slug` 參數讀取成分分片，渲染標題、未驗證成分提示、單方／複方 → 劑型分組；原本透過 `define:vars` 傳入的 `initialProducts` 改由分片資料提供
- [x] 5.3 沿用既有的物種、劑型、國產／輸入篩選，以及蛋雞／蛋鴨排除邏輯；確認分組結構與改動前相同
- [x] 5.4 實作 notFound / error 狀態與動態 `document.title`
- [x] 5.5 產品項目的勾選比較、成分連結、產品連結都改用新網址與 `escapeHtml()`

## 6. 比較頁（drug-comparison）

- [x] 6.1 `compare.astro` 改為依 `ids` 算出需要的分片（最多 3 片），平行 `fetch` 後查找產品；找不到的 slug 沿用既有的「有 n 項產品找不到」提示
- [x] 6.2 比較表的產品與成分連結改用 `drugUrl()`、`ingredientUrl()`，所有欄位加上 `escapeHtml()`
- [x] 6.3 從瀏覽器儲存的比較清單開啟時，流程與網址參數相同

## 7. 建置驗證與 CI

- [x] 7.1 改寫 `scripts/verify-release.ts`：檢查分片數量；抽樣產品與成分 slug 能在 `shardOf` 算出的分片中找到；成分 slug 無重複；`dist/drug/index.html` 與 `dist/ingredient/index.html` 存在；`dist/drug/` 與 `dist/ingredient/` 底下沒有子目錄；`dist/data/compare-data.json` 不存在
- [x] 7.2 確認 `.github/workflows/deploy.yml` 流程不需調整；如有需要，在 build 之後加入 `verify-release`
- [x] 7.3 `pnpm test`、`pnpm lint`、`pnpm build` 全部通過

## 8. 手動驗收

- [x] 8.1 以 `pnpm preview` 在 base path 下驗證：首頁搜尋 → 詳情頁 → 成分頁 → 加入比較 → 比較頁，全程沒有 404
- [x] 8.2 直接開啟以下網址，確認狀態正確：有效產品、失效產品、`?id=x-00000`、沒有參數的 `/drug/`、`/ingredient/?slug=tylosin`、`/compare?ids=m-09469,x-00000`
- [x] 8.3 在 375px 寬度下檢查詳情頁與成分頁版面
- [x] 8.4 以開發者工具確認：開啟詳情頁只下載 1 個產品分片；比較 2 項產品最多下載 2 個分片
- [x] 8.5 在 CI 上記錄改動後的 `astro build` 耗時與 `dist/` 大小，與 0.2 的基準比較，寫進 PR 說明
