# ingredient-browse Specification

## Purpose
規範以標準成分為入口的瀏覽體驗：成分頁列出含該成分的所有一般藥品，依單方／複方與劑型分組並提供物種、劑型、產地篩選，讓使用者從成分快速找到可用的動物用藥品並加入比較。

## Requirements

### Requirement: 成分頁
系統 SHALL 提供單一成分頁，網址為 `/ingredient/?slug=<成分 slug>`（標準英文名稱轉小寫，非英數字元換成連字號）。每個出現在一般藥品中的標準成分都 MUST 能以此網址開啟。頁面由瀏覽器端依 `slug` 參數讀取資料後渲染。直接開啟此網址時，回應狀態 MUST 為 200。頁面標題顯示英文標準名、中文名（有的話）與產品數，並同步設定為瀏覽器頁面標題。

#### Scenario: 產生成分頁
- **WHEN** 標準化結果中有 157 項產品含 FLORFENICOL
- **THEN** 建置只產出單一成分殼頁 `dist/ingredient/index.html`（不再為每個成分個別產生靜態頁），使用者開啟 `/ingredient/?slug=florfenicol` 時，瀏覽器以 FNV-1a 雜湊算出分片編號、讀取 `/data/ingredient/NNN.json` 中 slug 為 `florfenicol` 的條目後渲染成分頁

#### Scenario: 開啟成分頁
- **WHEN** 標準化結果中有 157 項產品含 FLORFENICOL，使用者開啟 `/ingredient/?slug=florfenicol`
- **THEN** 頁面標題顯示 FLORFENICOL、其中文名與產品數

#### Scenario: 查無成分
- **WHEN** 使用者開啟 `/ingredient/?slug=not-an-ingredient`
- **THEN** 頁面顯示「找不到此成分」與前往成分總覽的連結

#### Scenario: 載入失敗
- **WHEN** 讀取成分資料時發生網路錯誤
- **THEN** 頁面顯示「資料載入失敗」與重新載入按鈕

### Requirement: 分組呈現
成分頁 SHALL 先把產品分為「單方」與「複方」兩組，單方排在前面；每組內再依劑型大類分組。每個產品項目 MUST 顯示適用物種與限制標記。複方組 MUST 顯示說明：複方產品含其他成分，不能直接視為替代品。

#### Scenario: 單方與複方分開
- **WHEN** 使用者開啟 `/ingredient/lincomycin`
- **THEN** 只含 LINCOMYCIN 的產品列在「單方」組，含 LINCOMYCIN 與 SPECTINOMYCIN 的產品列在「複方」組，且複方組有不可直接替代的說明

#### Scenario: 依劑型分組
- **WHEN** 單方組中有口服液劑與注射劑產品
- **THEN** 兩種劑型各自成為子分組，並顯示各自的產品數

### Requirement: 成分頁篩選
成分頁 SHALL 提供物種、劑型大類、國產／輸入篩選，並套用與搜尋頁相同的預設排除規則與蛋雞／蛋鴨限制處理。

#### Scenario: 成分頁篩選物種
- **WHEN** 使用者在 `/ingredient/florfenicol` 篩選物種「豬」
- **THEN** 只顯示適用物種含豬的產品，分組結構維持不變

#### Scenario: 成分頁蛋雞篩選
- **WHEN** 使用者在成分頁篩選物種「蛋雞」
- **THEN** 帶有 `not-laying-hens` 限制的產品預設不顯示，並顯示被排除數量與展開開關

### Requirement: 未驗證成分標示
對未收錄在同義詞表中的成分，成分頁 SHALL 顯示「此成分為自動歸類，可能有同成分產品未被列入」的提示。

#### Scenario: 未驗證成分
- **WHEN** 使用者開啟一個 `verified` 為 false 的成分頁
- **THEN** 頁面頂端顯示自動歸類提示

### Requirement: 從產品與搜尋連到成分頁
產品詳情頁、搜尋結果、比較頁與成分總覽中的每個標準成分 SHALL 連結到對應的成分頁 `/ingredient/?slug=<成分 slug>`。

#### Scenario: 點選成分
- **WHEN** 使用者在產品詳情頁點選成分 FLORFENICOL
- **THEN** 進入 `/ingredient/?slug=florfenicol`

### Requirement: 從成分頁加入比較
成分頁的每個產品項目 SHALL 提供加入比較的勾選框，行為與搜尋頁一致。

#### Scenario: 成分頁勾選比較
- **WHEN** 使用者在成分頁勾選兩個產品
- **THEN** 浮動列顯示「比較已選 (2)」

### Requirement: 成分 slug 唯一
每個成分 slug SHALL 只對應一個成分。多個成分名稱產生相同 slug 時，系統 MUST 把它們合併為同一個成分：產品數最多的名稱作為標準名稱，其他名稱列為別名，產品數以不重複的產品計算。

#### Scenario: 名稱變體合併
- **WHEN** 成分名稱「TYLOSIN」與「TYLOSIN ，按乾燥品計算，每」都產生 slug `tylosin`
- **THEN** 只有一個 slug 為 `tylosin` 的成分，標準名稱為產品數較多的名稱，另一個名稱列為別名；開啟 `/ingredient/?slug=tylosin` 時，列出含任一名稱的產品

#### Scenario: 同一產品不重複計算
- **WHEN** 同一產品的成分同時出現兩個會合併的名稱
- **THEN** 該成分的產品數只計算這個產品一次

### Requirement: 成分總覽頁
系統 SHALL 提供成分總覽頁 `/ingredients`，依產品數由多到少列出標準成分，每項顯示英文標準名、中文名（有的話）與產品數，點選進入成分頁。未輸入過濾條件時 MUST 只顯示產品數最多的 80 項，區塊標題為「最常用成分 (Top 80)」，並提供「顯示全部 N 項成分」按鈕展開全部。過濾框 MUST 比對全部成分（不限前 80 項），比對英文名或中文名的任一部分且不分英文大小寫；有過濾條件時顯示所有符合的成分與符合數量，清除條件後回到前 80 項或使用者已展開的全部清單。

#### Scenario: 預設只列前 80 項
- **WHEN** 標準化結果中共有 2,694 項成分，使用者開啟 `/ingredients`
- **THEN** 頁面只顯示產品數最多的 80 項成分，標題為「最常用成分 (Top 80)」，並有「顯示全部 2,694 項成分」按鈕

#### Scenario: 展開全部
- **WHEN** 使用者點選「顯示全部 2,694 項成分」
- **THEN** 頁面依產品數由多到少列出全部 2,694 項成分

#### Scenario: 過濾比對全部成分
- **WHEN** BETAMETHASONE 的產品數排在第 500 名，使用者在過濾框輸入「betametha」
- **THEN** BETAMETHASONE 出現在結果中，並顯示符合的成分數量

#### Scenario: 沒有符合的成分
- **WHEN** 過濾條件沒有任何符合的成分
- **THEN** 清單顯示「沒有符合條件的成分」
