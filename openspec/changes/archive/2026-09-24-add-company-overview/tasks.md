# Tasks

## 1. 公司摘要資料

- [x] 1.1 `src/types/drug.ts` 新增 `CompanySummary` 型別；`pnpm lint` 通過
- [x] 1.2 `scripts/build-shards.ts` 在產生公司分片時一併輸出 `data/companies.json`（依產品數由多到少排列），`productCount` 與 `activeCount` 以不重複產品計算；`.gitignore` 加入 `data/companies.json`
- [x] 1.3 執行 `pnpm normalize`，確認 `data/companies.json` 共 600 筆、`activeCount > 0` 的有 190 筆，且「大豐化學製藥股份有限公司」的 `vendorCount`、`factoryCount` 與其公司分片中的數字相同

## 2. 過濾與排序邏輯

- [x] 2.0 新增 `src/lib/overview-filter.ts` 的名稱比對純函式（正規化空白、英文轉小寫、部分比對），撰寫測試涵蓋中文、英文大小寫、多餘空白與空查詢
- [x] 2.1 `src/lib/company.ts` 新增 `matchCompany(summary, { query, role, includeInactive })` 與 `compareCompanies(a, b, sortKey)`；撰寫測試：部分比對、英文不分大小寫、查詢含多餘空白、角色篩選、預設排除 `activeCount` 為 0 的公司、三種排序與同分時以名稱排序

## 3. 公司總覽頁

- [x] 3.1 新增 `src/pages/companies.astro`：建置時讀取 `data/companies.json`（不存在時渲染空清單），每家公司渲染為連到 `companyUrl()` 的卡片，顯示名稱、產品數、未失效許可證數、申請業者與製造廠產品數，無有效許可證的公司加上「無有效許可證」標記；`data-*` 屬性帶入過濾與排序所需欄位
- [x] 3.2 篩選區：名稱過濾框、角色（全部／申請業者／製造廠）、排序（產品數／未失效許可證數／名稱）、「包含已無有效許可證的公司」勾選項，以及「顯示 N / 總數 家」與「沒有符合條件的公司」空狀態
- [x] 3.3 模組 script 以 `matchCompany`、`compareCompanies` 套用條件並重新排列既有卡片；以 `pnpm preview` 確認預設顯示「顯示 190 / 600 家」、輸入「大豐」、輸入「swiss pharmaceutical」、選「製造廠」、切換排序與勾選包含無效公司時結果符合規格

## 4. 導覽列與公司頁連結

- [x] 4.1 `Layout.astro` 導覽列在「成分總覽」後加入「公司總覽」連結（`withBase('/companies')`）
- [x] 4.2 `src/pages/company/index.astro` 的「找不到此公司」連結改為前往 `/companies`，按鈕文字同步調整；以 `/company/?name=不存在的公司` 確認

## 5. 成分總覽修正

- [x] 5.0 記錄改動前 `dist/ingredients/index.html` 的大小與卡片外觀（截圖），作為比對基準
- [x] 5.1 `ingredients.astro` 改為渲染全部成分但第 81 項以後預設 `hidden`，加入「顯示全部 N 項成分」按鈕；移除未使用的 `topIngredients` 變數
- [x] 5.2 過濾改用 `overview-filter.ts`：有條件時比對全部成分並顯示符合數量與「沒有符合條件的成分」空狀態，清除後回到前 80 項或已展開的全部清單；以 `pnpm preview` 驗證規格中的四個情境（含輸入「betametha」找到排名第 500 的 BETAMETHASONE）
- [x] 5.3 卡片 inline style 改為 CSS class，確認外觀與 hover 效果與 5.0 基準一致，且 `dist/ingredients/index.html` 小於 500KB

## 6. 建置驗證與文件

- [x] 6.1 `scripts/verify-release.ts` 新增檢查：`dist/companies/index.html` 存在，且其中連到公司頁的項目數等於 `data/companies.json` 的筆數；`dist/ingredients/index.html` 中的成分項目數等於 `data/ingredients.json` 的筆數
- [x] 6.2 README 功能清單加入公司總覽
- [x] 6.3 `pnpm test`、`pnpm lint`、`pnpm build`、`pnpm verify` 全部通過

## 7. 手動驗收

- [x] 7.1 以 `pnpm preview` 在 base path 下：導覽列 → 公司總覽 → 過濾 → 點公司 → 公司頁；公司頁查無公司 → 公司總覽，全程沒有 404
- [x] 7.2 在 375px 寬度下檢查公司總覽頁、成分總覽頁與任一其他頁面：導覽列完整顯示五個連結，頁面沒有水平捲動；如有，依 design D3 調整導覽列後再檢查
