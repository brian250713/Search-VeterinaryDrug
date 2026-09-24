# product-detail Specification

## Purpose
TBD - created by archiving change add-vet-drug-search-site. Update Purpose after archive.
## Requirements
### Requirement: 產品詳情頁
系統 SHALL 為每個有效識別碼的產品（包含失效、生物製劑、原料藥、外銷專用）產生靜態頁面，網址為 `/drug/<slug>`，例如 `/drug/m-09469`。

#### Scenario: 開啟產品頁
- **WHEN** 使用者開啟 `/drug/m-09469`
- **THEN** 顯示福樂健口服液的詳情

#### Scenario: 失效產品仍可存取
- **WHEN** 使用者開啟一個狀態為 `expired` 的產品網址
- **THEN** 頁面正常顯示，頂端有「此許可證已失效」的醒目標示

### Requirement: 詳情內容
產品詳情頁 SHALL 顯示：中英文品名、許可證字號、國產／輸入、狀態與到期日、核發日期、分類（一般藥品、生物製劑、原料藥）、外銷專用、劑型原文與大類、包裝、業者名稱與地址、製造廠名稱與地址、標準成分（附成分頁連結與單方／複方標記）、清理後的成分原文、結構化的物種適應症，以及完整的適應症原文。空白欄位顯示「未載明」。

#### Scenario: 成分原文與標準成分並列
- **WHEN** 產品成分原文為「EACH ML CONTAINS：FLORFENICOL 200 MG」
- **THEN** 頁面同時顯示標準成分 FLORFENICOL（連到成分頁）與原文「EACH ML CONTAINS：FLORFENICOL 200 MG」

#### Scenario: 空白欄位
- **WHEN** 製造廠名稱為空字串
- **THEN** 製造廠名稱顯示「未載明」

### Requirement: 物種適應症呈現
產品詳情頁 SHALL 以列表呈現每個物種的適應症，物種帶有使用限制時 MUST 以醒目樣式顯示限制文字；泛稱展開的物種標示「泛稱」。

#### Scenario: 顯示蛋雞限制
- **WHEN** 產品有一筆雞的物種適應症，限制為 `not-laying-hens`
- **THEN** 雞的項目旁以警示樣式顯示「不含產蛋中之蛋雞」

### Requirement: 從詳情頁加入比較
產品詳情頁 SHALL 提供「加入比較」按鈕，行為與列表勾選框一致。

#### Scenario: 詳情頁加入比較
- **WHEN** 使用者在詳情頁點選「加入比較」
- **THEN** 該產品加入比較清單，按鈕變為「已加入比較」

