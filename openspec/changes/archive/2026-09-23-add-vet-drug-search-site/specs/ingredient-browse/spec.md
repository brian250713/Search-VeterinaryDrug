## ADDED Requirements

### Requirement: 成分頁
系統 SHALL 為每個出現在一般藥品中的標準成分產生靜態頁面，網址為 `/ingredient/<成分 slug>`（標準英文名稱轉小寫、空白換成連字號）。頁面標題顯示英文標準名與中文名（有的話）以及產品數。

#### Scenario: 產生成分頁
- **WHEN** 標準化結果中有 157 項產品含 FLORFENICOL
- **THEN** 網站有 `/ingredient/florfenicol` 頁面，標題顯示 FLORFENICOL 與其中文名，以及產品數

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
產品詳情頁、搜尋結果與比較頁中的每個標準成分 SHALL 連結到對應的成分頁。

#### Scenario: 點選成分
- **WHEN** 使用者在產品詳情頁點選成分 FLORFENICOL
- **THEN** 進入 `/ingredient/florfenicol`

### Requirement: 從成分頁加入比較
成分頁的每個產品項目 SHALL 提供加入比較的勾選框，行為與搜尋頁一致。

#### Scenario: 成分頁勾選比較
- **WHEN** 使用者在成分頁勾選兩個產品
- **THEN** 浮動列顯示「比較已選 (2)」
