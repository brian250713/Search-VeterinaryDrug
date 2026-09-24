## Context

目前的架構（`add-vet-drug-search-site`）是 Astro 全靜態輸出：

```
pnpm normalize → data/products.json (17MB, 13,737 筆)
               → data/ingredients.json (2,851 筆，其中 123 組 slug 撞名)
               → public/data/compare-data.json (12MB)
               → public/data/search-index.json / expired-search-index.json

astro build → /drug/<slug>/index.html        × 13,737
            → /ingredient/<slug>/index.html  × 2,694
            → index / ingredients / compare / about-data
```

本機實測（Astro 5.18.2、Windows）：總建置時間 13m22s，其中產生靜態頁面 721 秒，平均每頁 43ms，`dist/` 共 372MB。搜尋頁與比較頁早就是瀏覽器端渲染（`fetch` JSON 加字串組 HTML），所以瀏覽器端渲染在這個專案裡已經是既有做法。詳情頁與成分頁是唯二依賴 `getStaticPaths` 大量產頁的地方。

限制：
- 部署在 GitHub Pages，沒有伺服器端改寫規則，也沒有 SSR。
- SEO 不是需求；連結必須能直接分享，開啟時回應狀態為 200。
- 資料每週更新一次。

另外發現兩個既有缺陷：
1. **成分 slug 撞名**：`normalize.ts` 以成分名稱為 key 彙總，slug 由名稱轉小寫、非英數字元換成 `-`。有 123 組不同名稱產生相同 slug，例如 `TYLOSIN` 與 `TYLOSIN ，按乾燥品計算，每`。靜態建置時後者覆蓋前者，`/ingredient/tylosin` 可能顯示錯的成分。
2. **base path 缺失**：`site` 為 `https://example.github.io/Search-VeterinaryDrug`，但沒有設定 `base`，程式碼中的連結與 `fetch` 都寫成 `/drug/...`、`/data/...` 這類絕對路徑，部署到 GitHub Pages 專案網址後會 404。

## Goals / Non-Goals

**Goals:**
- CI 上的 `astro build` 在 1 分鐘以內完成；HTML 產出從約 16,400 頁降到約 6 頁。
- 詳情頁與成分頁的連結可以分享，直接開啟時回應狀態為 200。
- 開啟單一詳情頁時，只下載該產品所在的分片（gzip 後約 20KB 等級）。
- 詳情頁與成分頁的呈現內容、分組、篩選行為，與現行 spec 相同。
- 一併修正成分 slug 撞名與 base path。

**Non-Goals:**
- 不做 SEO、sitemap、社群預覽卡（Open Graph）的個別化。
- 不引入 UI 框架（Preact、React 等）；沿用既有的原生 JS 加字串模板寫法。
- 不改搜尋索引的結構與搜尋行為。
- 不為舊網址 `/drug/<slug>` 提供轉址，因為網站尚未正式上線，沒有既有外部連結需要相容。如果上線前已經分享過連結，見 Open Questions。

## Decisions

### D1. 網址使用 query 參數：`/drug/?id=<slug>`、`/ingredient/?slug=<slug>`

GitHub Pages 只能提供靜態檔案，`/drug/?id=x` 會直接對應到 `/drug/index.html`，回應狀態為 200，分享與重新整理都沒問題。

替代方案：
- Hash（`/drug/#x`）：同樣可行，但 hash 常被聊天軟體或短網址服務截掉，也不容易在分析工具中看到。
- 漂亮路徑加 `404.html` fallback：GitHub Pages 會回 404 狀態，有些 App 內建瀏覽器與連結預覽會直接判定為壞連結。不採用。

參數名稱沿用資料欄位名：藥品用 `id`（許可證 slug），成分用 `slug`。比較頁維持既有的 `?ids=`。

### D2. 產品資料以 FNV-1a 雜湊分成 128 片

`src/lib/shard.ts` 同時給 Node 建置腳本與瀏覽器端使用：

```
shardOf(key, count) = fnv1a32(key) % count        // key 為 ASCII slug
shardPath(kind, n)  = `data/${kind}/${String(n).padStart(3,'0')}.json`
DRUG_SHARDS = 128, INGREDIENT_SHARDS = 64
```

分片內容為 `{ [slug]: Product }` 物件，前端直接用 slug 查詢。每片約 107 筆 × 約 1KB，約 107KB，gzip 後約 20KB。

替代方案：
- 一藥一檔：邏輯最直白，但會產生 13,737 個檔案。GitHub Pages artifact 打包、上傳，以及本機 Windows 寫檔都會被檔案數量拖慢，這正是這次要解決的問題。
- 依 slug 前綴分片：slug 是 `i-00001`、`m-f0292` 這種形式，分佈很不平均。
- 全部放在一個檔案：17MB，詳情頁無法接受。

片數選 128，是在單片大小與檔案數量之間取平衡。雜湊函式與片數寫成常數，由建置腳本與前端共用同一份程式碼，避免兩邊算出不同結果。之後如果調整片數，只要重新建置即可，因為分片檔與前端程式一起部署。

### D3. 成分頁使用預先彙總的成分分片

成分頁需要「含這個成分的所有一般藥品」的摘要，但這些產品散落在不同的產品分片裡。因此另外產生成分分片 `data/ingredient/NNN.json`，依成分 slug 雜湊分成 64 片。內容為 `{ [ingredientSlug]: { ingredient, products: ProductSummary[] } }`。

`ProductSummary` 只保留成分頁實際用到的欄位：`slug, licenseNo, nameZh, nameEn, origin, category, status, expiryDate, dosageFormCategory, isSingleIngredient, ingredients(name, slug, chineseName), speciesIndications(species, label, restrictions, generic), vendorName, exportOnly`。不含適應症全文。

替代方案：成分頁載入 `search-index.json`（7.7MB）再篩選。首頁使用者可能已經快取這個檔案，但直接從分享連結進來的人要下載整份索引，而且索引裡不含失效產品，不採用。

`ingredients.astro`（成分總覽）維持建置時靜態產生，只有 1 頁，不受影響。

### D4. 成分以 slug 為主鍵合併

`normalize.ts` 的成分彙總改為以 slug 為 key。同一個 slug 的多個成分名稱合併為一個成分：
- 標準名稱（`name`）取產品數最多的那個名稱，同數時取最短的。
- 其他名稱放進 `aliases`。
- `verified` 只要其中一個名稱已驗證就是 true。
- 產品數以產品去重後計算，因為同一產品可能同時含兩種寫法。

產品上的 `ingredients[].name` 保留原值，另外加上 `slug` 欄位，讓前端建立成分連結時不必自己從名稱算 slug。目前 `index.astro`、`compare.astro`、成分頁各自在前端算 slug，改由資料提供，可以消除三份重複邏輯。

### D5. 移除 `compare-data.json`，比較頁改讀產品分片

比較頁最多 3 項產品，最多讀 3 個分片（約 300KB，gzip 後約 60KB），取代現在的 12MB。比較頁需要的欄位全都在 `Product` 中。網址中 slug 在對應分片裡找不到的，就視為無效 slug，與現行 spec 行為一致。

### D6. base path 統一處理

`astro.config.mjs` 設定 `base: '/Search-VeterinaryDrug'`。新增 `src/lib/url.ts`：

```
withBase(path)          // Astro 檔案中使用 import.meta.env.BASE_URL
drugUrl(slug)           → `${base}/drug/?id=${encodeURIComponent(slug)}`
ingredientUrl(slug)     → `${base}/ingredient/?slug=${encodeURIComponent(slug)}`
dataUrl(path)           → `${base}/${path}?v=${dataVersion}`
```

瀏覽器端的 `<script>` 改用 Astro 處理的模組 script，不再使用 `is:inline`，這樣就能 import `shard.ts`、`url.ts`、`escape-html.ts`、`display-helpers.ts`。base 與資料版本號由頁面以 `data-*` 屬性或 `define:vars` 傳入。

`dataVersion` 使用 `meta.json` 的 `fetchedAt`。每週部署後，網址參數一改就能避開 GitHub Pages 預設約 10 分鐘的快取，避免舊殼頁搭配新分片、或新殼頁搭配舊分片的混用情況。

### D7. `escapeHtml()` 與渲染方式

新增 `src/lib/escape-html.ts`，跳脫 `& < > " '`。所有以樣板字串組 HTML 的地方，資料欄位一律先經過 `escapeHtml()`；放進屬性的網址另外經過 `encodeURIComponent`。這個規則同時套用到既有的 `index.astro` 與 `compare.astro`，它們目前直接插入 `${p.nameZh}`。

詳情頁的版面沿用現有 `[slug].astro` 的 HTML 結構與 class，改寫成一個 `renderProduct(product): string` 函式。模板結構不變，視覺也就不會變。

### D8. 頁面狀態

```
          ┌─────────┐  缺少 id 參數              ┌──────────┐
 開啟頁面 ─▶│ loading │──────────────────────────▶│ notFound │
          └────┬────┘  分片中沒有此 slug          └──────────┘
               │ fetch 失敗 / 非 2xx / JSON 錯誤    ┌──────────┐
               ├──────────────────────────────────▶│  error   │（附「重新載入」按鈕）
               │ 找到資料                          └──────────┘
               ▼
          ┌─────────┐
          │  ready  │ document.title = `${nameZh} (${licenseNo}) - 動物用藥資訊`
          └─────────┘
```

殼頁的靜態 HTML 預設就是 loading 狀態（骨架畫面），並附 `<noscript>` 說明需要開啟 JavaScript。

### D9. 分片產生的位置

新增 `scripts/build-shards.ts`，並加進 `pnpm normalize` 指令鏈，放在 `build-search-index.ts` 之後。分片輸出到 `public/data/drug/` 與 `public/data/ingredient/`，Astro 會原樣複製到 `dist/`。產生前先清空這兩個目錄，避免殘留舊分片。

`verify-release.ts` 改為檢查：分片數量正確；抽樣的產品 slug 能在 `shardOf` 算出的分片中找到；成分 slug 沒有重複；`dist/drug/index.html` 與 `dist/ingredient/index.html` 存在；`dist/drug/` 底下沒有殘留的子目錄。

## Risks / Trade-offs

- [搜尋引擎無法收錄個別產品與成分] → 使用者已確認 SEO 不是需求。
- [社群預覽卡只顯示網站通用標題] → 已知取捨，寫在 proposal；殼頁提供通用的 `og:title`、`og:description`。
- [使用者關閉 JavaScript 就看不到詳情] → 搜尋頁本來就需要 JS；殼頁用 `<noscript>` 說明。
- [前端與建置腳本的雜湊結果不一致，導致找不到資料] → 共用同一個 `shard.ts`，並用單元測試固定幾組 slug 對應的分片編號。`verify-release.ts` 在建置後實際抽樣驗證。
- [部署期間新舊檔案混用] → 資料網址帶 `?v=<fetchedAt>`。分片檔名本身不帶版本，舊殼頁在快取期間讀到新分片仍然可以正常顯示，因為資料結構相容。
- [改用 `innerHTML` 產生 XSS] → D7 規定一律跳脫，並補測試：含 `<script>` 與 `"` 的品名渲染後必須是純文字。
- [成分 slug 合併後，舊的成分名稱連結失效] → 前端改用資料提供的 `ingredients[].slug`，合併後的 slug 仍然相同，連結不受影響。
- [詳情頁多一次網路往返，首次顯示變慢] → 單片 gzip 後約 20KB，影響可以接受；殼頁先顯示骨架畫面。

## Migration Plan

1. 先歸檔 `add-vet-drug-search-site`，建立 `openspec/specs/` 基準規格。
2. 在同一個 PR 中完成資料腳本、頁面、連結與設定的修改。
3. CI 上比較改動前後的建置時間與 `dist/` 大小，並在 PR 中記錄。
4. 回復方式：revert 這個 PR，下一次排程建置就會恢復靜態頁面。這次改動不涉及外部狀態。

## Open Questions

- 正式網域是否就是 `https://<user>.github.io/Search-VeterinaryDrug`？如果改用自訂網域，`base` 應該設為 `/`。目前先依 `site` 設定處理，改網域時只需要調整 `astro.config.mjs`。
- 上線前是否已經有人分享過 `/drug/<slug>` 格式的連結？如果有，可以另外在 `404.html` 加入轉址：將 `/drug/<slug>` 導向 `/drug/?id=<slug>`。
