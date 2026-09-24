# 動物用藥品資訊查詢

整理農業部動植物防疫檢疫署「動物用藥資訊」開放資料的靜態查詢網站，給獸醫師與養殖戶快速查找、比較動物用藥品。

網站：https://brian250713.github.io/Search-VeterinaryDrug/

## 功能

- **搜尋**：中英文品名、成分、許可證字號全文搜尋，可依物種、劑型、國產／輸入等條件篩選，篩選結果可用網址分享。
- **產品詳情**：`/drug/?id=<slug>`，顯示品名、效期與狀態、標準成分與成分原文、適用物種與使用限制。
- **成分瀏覽**：`/ingredient/?slug=<slug>`，列出含該成分的藥品，依單方／複方與劑型分組。
- **並排比較**：最多 3 項產品並排比較成分、劑型、物種與使用限制，比較網址可分享。

失效許可證與生物製劑預設不顯示；蛋雞／蛋鴨有使用限制的產品會特別標示。本站不含停藥期與用法用量。

## 技術架構

- [Astro](https://astro.build/) 靜態網站，部署在 GitHub Pages（base path `/Search-VeterinaryDrug`）。
- 搜尋使用 [MiniSearch](https://github.com/lucaong/minisearch)，在瀏覽器端執行，索引延遲載入。
- 詳情頁與成分頁是單一殼頁，瀏覽器依 slug 以 FNV-1a 雜湊算出分片，只下載需要的 JSON 分片（產品 128 片、成分 64 片）。

### 資料流程

```
MOA API ──fetch──▶ data/raw.json ──normalize──▶ data/products.json、ingredients.json
                                              ├─▶ public/data/search-index.json
                                              └─▶ public/data/drug/NNN.json、ingredient/NNN.json
```

| 指令 | 說明 |
|---|---|
| `pnpm run fetch` | 從 API 分頁抓取全部許可證資料，含重試與筆數檢查（對照 `data/baseline.json`） |
| `pnpm normalize` | 標準化欄位、抽取成分與物種，產生搜尋索引與資料分片 |
| `pnpm build` | 建置 Astro 靜態網站到 `dist/` |
| `pnpm verify` | 檢查建置結果：分片數量、抽樣查找、頁面是否存在 |
| `pnpm test` | 執行單元測試（Vitest） |
| `pnpm lint` | TypeScript 型別檢查 |

## 本機開發

需要 Node.js 22 與 pnpm 10。

```bash
pnpm install
pnpm run fetch
pnpm normalize
pnpm dev
```

開發伺服器網址為 `http://localhost:4321/Search-VeterinaryDrug/`。

## 目錄結構

```
scripts/        資料抓取、標準化、分片與發布驗證腳本
src/lib/        共用模組（標準化、分片、搜尋斷詞、HTML 跳脫、網址）
src/pages/      頁面（首頁搜尋、詳情、成分、成分總覽、比較、關於資料）
data/           人工維護的對照表（同義詞、物種、劑型）與筆數基準
public/data/    產生的搜尋索引與資料分片
tests/          單元測試
openspec/       規格文件（OpenSpec）
```

## 部署

`.github/workflows/deploy.yml` 在推送到 `main`、每週一 02:00 UTC 排程，或手動觸發時執行：抓取 → 標準化 → 測試 → 建置 → 驗證 → 部署到 GitHub Pages，完成後更新 `data/baseline.json`。任一步驟失敗就不部署，線上版本維持不變。

## 資料來源與授權

- 資料來源：農業部動植物防疫檢疫署「[動物用藥資訊](https://data.moa.gov.tw/dataset/adprodata)」開放資料
- 資料授權：[政府資料開放授權條款](https://data.gov.tw/license)

## 免責聲明

本站內容整理自政府開放資料，成分與物種為程式自動抽取，可能有誤，僅供查詢參考，不構成用藥建議。用藥請遵從獸醫師指示，並以主管機關公告為準。
