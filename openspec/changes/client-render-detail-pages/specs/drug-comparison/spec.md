## MODIFIED Requirements

### Requirement: 比較表內容
比較頁 SHALL 以列為屬性、欄為產品呈現：中文品名（連到詳情頁 `/drug/?id=<slug>`）、劑型、標準成分（單方／複方標記，連到成分頁 `/ingredient/?slug=<成分 slug>`）、成分原文、國產／輸入、業者、狀態與到期日、包裝。所有產品值相同的列 MUST 以視覺方式標示為「相同」，不同的列標示為「有差異」。所有資料欄位 MUST 以純文字呈現，不得被瀏覽器解讀為標籤或指令碼。

#### Scenario: 相同成分標示
- **WHEN** 比較的 2 項產品標準成分都只有 FLORFENICOL
- **THEN** 成分列標示為相同

#### Scenario: 複方標示
- **WHEN** 比較中有一項產品為複方
- **THEN** 該產品的成分儲存格明確標示「複方」並列出所有成分

#### Scenario: 品名連到詳情頁
- **WHEN** 使用者在比較頁點選產品 m-09469 的中文品名
- **THEN** 進入 `/drug/?id=m-09469`

## ADDED Requirements

### Requirement: 比較頁只載入所需資料
比較頁 SHALL 只下載所選產品所需的資料，MUST NOT 下載全部產品的資料。

#### Scenario: 比較 2 項產品
- **WHEN** 使用者開啟 `/compare?ids=m-09469,i-07606`
- **THEN** 瀏覽器只下載這 2 項產品所在的資料分片，不下載包含全部產品的資料檔
