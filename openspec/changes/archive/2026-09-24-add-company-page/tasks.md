# Tasks

## 1. 共用模組與型別

- [x] 1.1 新增 `normalizeCompanyName()`（去除前後空白、連續空白與全形空白合併為一個半形空白），並撰寫測試：`SWISS PHARMACEUTICAL CO.,  LTD.` 正規化為單一空白、中文名稱不變、空字串回傳空字串
- [x] 1.2 `src/lib/url.ts` 新增 `companyUrl(name)`，內部先正規化再 `encodeURIComponent` 並加上 base；測試含 `&`、空白、中文的名稱產生正確網址
- [x] 1.3 `src/lib/shard.ts` 新增 `COMPANY_SHARDS = 64`；撰寫測試固定 3 個中英文公司名稱的分片編號，防止雜湊結果漂移
- [x] 1.4 `src/types/drug.ts` 新增 `CompanyProductSummary`（`ProductSummary` 加 `roles`）與 `CompanyDetailShard`，`ProductSummary` 新增 `factoryName`；`pnpm lint` 通過

## 2. 共用產品清單模組（先保護成分頁行為）

- [x] 2.1 先為成分頁現有的篩選與分組行為撰寫測試（以固定的產品摘要資料）：物種、水產、蛋雞排除計數、劑型、產地、效期、單方／複方 → 劑型分組；在搬移前以暫時抽出的函式確認測試通過
- [x] 2.2 新增 `src/lib/product-list.ts`：`filterProducts()`、`groupProducts()`、`renderProductCard()`，新增類別與角色篩選選項，以及被預設條件隱藏的各類數量；水產物種集合改用 `filter-engine.ts` 的定義；2.1 的測試全部通過
- [x] 2.3 補測試：角色篩選（同時擔任兩種角色的產品在兩種篩選下都出現、只出現一次）、類別預設只含一般藥品、隱藏數量正確、卡片 HTML 中品名含 `<script>` 時以純文字輸出
- [x] 2.4 成分頁改用 `product-list.ts`，移除頁面內重複的篩選、分組與卡片程式；以 `pnpm preview` 開啟 `/ingredient/?slug=florfenicol` 與 `/ingredient/?slug=lincomycin`，確認分組、數量、篩選結果與改動前相同

## 3. 公司分片

- [x] 3.1 `scripts/build-shards.ts` 產生公司分片：依正規化名稱彙整業者與製造廠角色、每項產品只列一次、收集並依次數排序地址、計算 `vendorCount` 與 `factoryCount`；空白名稱不建立公司；清空並輸出到 `public/data/company/`
- [x] 3.2 成分分片與公司分片的產品摘要都填入 `factoryName`
- [x] 3.3 建置日誌記錄公司數與公司分片大小；執行 `pnpm normalize`，確認產出 64 個分片、公司數約 600、「大豐化學製藥股份有限公司」的 `vendorCount` 為 252、`m-09469` 的 `roles` 為業者與製造廠

## 4. 公司頁

- [x] 4.1 新增 `src/pages/company/index.astro` 殼頁：骨架畫面、`<noscript>` 說明、通用 `og:title`／`og:description`，版面與成分頁一致
- [x] 4.2 實作狀態流程：讀取並正規化 `name` → 算出分片 → `fetch` → loading / notFound / error / ready；notFound 附回到首頁搜尋的連結，error 附重新載入按鈕；以 `/company/?name=不存在的公司` 與不帶參數驗證 notFound
- [x] 4.3 頁首：公司名稱、主要地址（其餘地址收合）、申請業者與製造廠產品數；ready 時設定 `document.title` 為「<公司名稱> - 動物用藥資訊」
- [x] 4.4 篩選區：角色（全部／申請業者／製造廠）、物種、劑型、國產／輸入、「包含生物製劑」「包含原料藥」「包含已失效」，並顯示被預設條件隱藏的數量；以只有生物製劑的公司驗證提示與勾選後的結果
- [x] 4.5 產品清單使用 `product-list.ts` 分組與渲染，卡片顯示角色標記，另一方公司名稱連到其公司頁；勾選比較後浮動列數量正確

## 5. 其他頁面的公司連結

- [x] 5.1 `render-product.ts` 的申請業者與製造廠名稱改為 `companyUrl()` 連結，空白時顯示「未載明」且不加連結；更新 `renderProduct` 測試涵蓋兩種情況
- [x] 5.2 `compare.astro` 比較表的業者與製造廠列改為連結，空白不加連結
- [x] 5.3 `index.astro` 搜尋結果卡片的業者名稱改為連結
- [x] 5.4 全站搜尋 `vendorName`、`factoryName` 的顯示位置，確認沒有遺漏且都經過 `escapeHtml()`

## 6. 建置驗證與文件

- [x] 6.1 `scripts/verify-release.ts` 新增檢查：公司分片數量為 64、抽樣業者與製造廠名稱能在算出的分片中找到、`dist/company/index.html` 存在、`dist/company/` 底下沒有子目錄
- [x] 6.2 README 的功能清單與目錄說明加入公司頁
- [x] 6.3 `pnpm test`、`pnpm lint`、`pnpm build`、`pnpm verify` 全部通過

## 7. 手動驗收

- [x] 7.1 以 `pnpm preview` 在 base path 下走完：搜尋 → 詳情頁 → 點業者 → 公司頁 → 切換角色與類別 → 加入比較 → 比較頁 → 點製造廠 → 公司頁，全程沒有 404
- [x] 7.2 直接開啟：`/company/?name=大豐化學製藥股份有限公司`、名稱含多餘空白的製造廠、只有生物製劑的公司、`/company/?name=不存在的公司`，確認狀態正確
- [x] 7.3 在 375px 寬度下檢查公司頁版面
- [x] 7.4 以開發者工具確認開啟公司頁只下載 1 個公司分片
