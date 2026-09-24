# Design

## Context

- 成分總覽 `src/pages/ingredients.astro` 在建置時讀取 `data/ingredients.json`，把所有成分直接渲染成靜態連結卡片，瀏覽器端只用一段 inline script 依 `data-search` 屬性切換顯示。
- 公司資料目前只存在於公司分片（`public/data/company/NNN.json`），由 `scripts/build-shards.ts` 產生；分片中每家公司已有 `vendorCount`、`factoryCount` 與完整產品摘要，但沒有一份所有公司的清單。
- 資料現況：600 家公司，只擔任申請業者 255 家、只擔任製造廠 193 家、兩者皆有 152 家；410 家已沒有任何未失效許可證；186 家名稱不含中文；每家產品數中位數 13、最多 358。
- 導覽列目前有 4 個連結，375px 寬時每個連結已經折成兩行，再加一個需要確認不會撐出水平捲動。

## Goals / Non-Goals

**Goals:**
- 總覽頁不需要下載任何 JSON 就能顯示與過濾，與成分總覽的體驗一致。
- 公司統計數字與公司頁使用同一次彙整結果，兩邊不會對不上。

**Non-Goals:**
- 在首頁搜尋中加入公司名稱建議或自動完成。
- 公司別名合併（見 `add-company-page` 設計的非目標）。

## Decisions

### D1. 建置時產出 `data/companies.json`，總覽頁靜態渲染

`build-shards.ts` 彙整公司時已經有每家公司的全部產品，順手輸出一份摘要清單到 `data/companies.json`：

```ts
interface CompanySummary {
  name: string;          // 正規化後名稱，與公司頁 key 相同
  productCount: number;  // 不重複產品數
  activeCount: number;   // status !== 'expired' 的不重複產品數
  vendorCount: number;
  factoryCount: number;
}
```

`src/pages/companies.astro` 在建置時讀取這個檔案（檔案不存在時渲染空清單，與成分總覽相同），每家公司渲染成一個連到 `companyUrl(name)` 的卡片，並把過濾與排序需要的欄位放在 `data-*` 屬性。

- 替代方案：總覽頁在瀏覽器端下載一份 `public/data/companies.json` 再渲染。多一次請求、多一個載入狀態，而 600 筆的靜態 HTML 只有約 250KB（gzip 後約 30KB），沒有必要。
- 替代方案：總覽頁建置時自己讀 `products.json` 重新彙整。會出現第二份彙整邏輯，與公司頁的數字可能不一致。

### D2. 過濾、篩選與排序全部在瀏覽器端處理 DOM

使用模組 `<script>`（非 inline），以便 import `normalizeCompanyName`。每次條件變更時：

1. 依「包含已無有效許可證的公司」、角色、名稱過濾決定每張卡片是否顯示。名稱過濾把輸入與公司名稱都做 `normalizeCompanyName` 後轉小寫，再用 `includes` 比對。
2. 依排序選項對卡片重新排列（`appendChild` 既有節點，不重建 HTML）。產品數與未失效數相同時，以名稱作為次要排序，確保順序穩定；名稱排序使用 `localeCompare(…, 'zh-Hant')`。
3. 更新「顯示 N / 600 家」與空狀態。

判斷邏輯抽成純函式 `matchCompany(summary, options)` 與 `compareCompanies(a, b, sortKey)`，放在 `src/lib/company.ts`（名稱比對使用 D4 的 `src/lib/overview-filter.ts`），用 Vitest 測試；頁面只負責讀 `data-*` 與操作 DOM。

- 預設排序為產品數，預設不含已無有效許可證的公司，與網站其他頁面預設排除已失效許可證的做法一致。

### D3. 導覽列

在「成分總覽」後加入「公司總覽」。實作後在 375px 寬度檢查，若出現水平捲動，讓 `.nav-links` 允許換行（`flex-wrap: wrap`）並縮小間距，而不是縮短文字或改成漢堡選單。

### D4. 成分總覽：保留靜態渲染，預設只顯示前 80 項

目前 `ingredients.astro` 算出 `topIngredients = ingredients.slice(0, 80)` 卻沒有使用，實際渲染全部 2,694 項，每張卡片約 700 bytes，大多是重複的 inline style。做法：

- 仍在建置時渲染全部成分（`data/ingredients.json` 已依產品數排序），讓過濾框不需額外下載資料就能比對全部成分。
- 第 81 項以後的卡片加上 `hidden` 屬性；「顯示全部 N 項成分」按鈕移除這些 `hidden`。
- 過濾時忽略前 80 項的限制，顯示所有符合的卡片與符合數量；清除過濾後依是否已展開回復。
- 卡片的 inline style 改為 `.ing-item-card` 等 CSS class，只輸出一次，預估 HTML 降到 500KB 以下。
- 過濾邏輯與公司總覽共用相同的比對方式（正規化空白、英文轉小寫、`includes`），抽成 `src/lib/overview-filter.ts` 的純函式並測試。

- 替代方案：只把標題改成「全部成分」。最省事，但 1.9MB 的頁面在手機上載入慢，且標題與程式原本的意圖（前 80 項）不符。
- 替代方案：只渲染前 80 項，過濾時下載一份成分 JSON。多一個載入狀態與請求，對 2,694 筆的清單沒有必要。

## Risks / Trade-offs

- [靜態頁面的數字只在建置時更新] → 與成分總覽相同，每週排程重建即更新；`data/companies.json` 與公司分片由同一個腳本同一次執行產生。
- [名稱排序對中英文混合的結果不直觀] → `zh-Hant` 排序會把英文排在一起、中文依筆畫；預設排序是產品數，名稱排序只是輔助。
- [導覽列擠] → D3 的檢查與備案；驗收時截圖確認。
- [成分總覽改用 class 後樣式跑掉] → 驗收時比對改動前後的卡片外觀與 hover 效果。

## Migration Plan

純新增頁面與一個建置產出檔，沒有網址或資料格式的破壞性變更。回滾時還原 commit 並重新部署即可。
