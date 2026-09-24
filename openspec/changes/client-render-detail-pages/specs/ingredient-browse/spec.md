## MODIFIED Requirements

### Requirement: 成分頁
系統 SHALL 提供單一成分頁，網址為 `/ingredient/?slug=<成分 slug>`（標準英文名稱轉小寫，非英數字元換成連字號）。每個出現在一般藥品中的標準成分都 MUST 能以此網址開啟。頁面由瀏覽器端依 `slug` 參數讀取資料後渲染。直接開啟此網址時，回應狀態 MUST 為 200。頁面標題顯示英文標準名、中文名（有的話）與產品數，並同步設定為瀏覽器頁面標題。

#### Scenario: 開啟成分頁
- **WHEN** 標準化結果中有 157 項產品含 FLORFENICOL，使用者開啟 `/ingredient/?slug=florfenicol`
- **THEN** 頁面標題顯示 FLORFENICOL、其中文名與產品數

#### Scenario: 查無成分
- **WHEN** 使用者開啟 `/ingredient/?slug=not-an-ingredient`
- **THEN** 頁面顯示「找不到此成分」與前往成分總覽的連結

#### Scenario: 載入失敗
- **WHEN** 讀取成分資料時發生網路錯誤
- **THEN** 頁面顯示「資料載入失敗」與重新載入按鈕

### Requirement: 從產品與搜尋連到成分頁
產品詳情頁、搜尋結果、比較頁與成分總覽中的每個標準成分 SHALL 連結到對應的成分頁 `/ingredient/?slug=<成分 slug>`。

#### Scenario: 點選成分
- **WHEN** 使用者在產品詳情頁點選成分 FLORFENICOL
- **THEN** 進入 `/ingredient/?slug=florfenicol`

## ADDED Requirements

### Requirement: 成分 slug 唯一
每個成分 slug SHALL 只對應一個成分。多個成分名稱產生相同 slug 時，系統 MUST 把它們合併為同一個成分：產品數最多的名稱作為標準名稱，其他名稱列為別名，產品數以不重複的產品計算。

#### Scenario: 名稱變體合併
- **WHEN** 成分名稱「TYLOSIN」與「TYLOSIN ，按乾燥品計算，每」都產生 slug `tylosin`
- **THEN** 只有一個 slug 為 `tylosin` 的成分，標準名稱為產品數較多的名稱，另一個名稱列為別名；開啟 `/ingredient/?slug=tylosin` 時，列出含任一名稱的產品

#### Scenario: 同一產品不重複計算
- **WHEN** 同一產品的成分同時出現兩個會合併的名稱
- **THEN** 該成分的產品數只計算這個產品一次
