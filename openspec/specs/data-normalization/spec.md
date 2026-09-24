# data-normalization Specification

## Purpose
規範把 API 原始欄位轉成網站可用的標準化產品資料：產品 slug、文字與民國日期清理、許可證狀態判定、產品分類與劑型分層、成分抽取與標準化、物種與使用限制抽取，以及供維護用的建置日誌。

## Requirements
### Requirement: 產品識別碼
系統 SHALL 從許可證字號產生穩定的 slug：「製字」對應 `m`，「入字」對應 `i`，後接字號中的號碼（保留英文字母），例如「動物藥製字第09469號」→ `m-09469`、「動物藥製字第F0106號」→ `m-f0106`。許可證字號空白或無法解析的資料列 MUST 略過並記入建置日誌；字號重複時保留最後一筆並記入日誌。

#### Scenario: 國產許可證
- **WHEN** 許可證字號為「動物藥製字第09469號」
- **THEN** slug 為 `m-09469`，產地為「國產」

#### Scenario: 輸入許可證
- **WHEN** 許可證字號為「動物藥入字第07606號」
- **THEN** slug 為 `i-07606`，產地為「輸入」

#### Scenario: 字號空白
- **WHEN** 某筆資料的許可證字號為空字串
- **THEN** 該筆不出現在輸出中，建置日誌記錄一筆略過

### Requirement: 文字清理
系統 SHALL 移除所有欄位中的 HTML 標籤並解碼 HTML entity；成分欄的 `<br>`、`<div>` 等換行類標籤 MUST 轉為分隔，而不是直接刪除，以免相鄰成分黏在一起。`<sub>` 等行內標籤移除後保留其文字。

#### Scenario: 成分含 HTML
- **WHEN** 成分為 `<div>EACH ML CONTAINS：<br>FLORFENICOL 200 MG</div>`
- **THEN** 清理後的成分原文不含任何 `<` 或 `&nbsp;`，且「EACH ML CONTAINS：」與「FLORFENICOL 200 MG」位於不同行

### Requirement: 民國日期轉換
系統 SHALL 把核發日期與有效期間中的民國日期轉為 ISO 日期（民國年 + 1911），支援「中華民國110年09月13日」、「至120年08月31日止」、「中華民國1100913」等格式；無法解析時該日期為空值，不得中止流程。

#### Scenario: 標準格式
- **WHEN** 核發日期為「中華民國110年09月13日」
- **THEN** 轉換結果為 `2021-09-13`

#### Scenario: 無分隔格式
- **WHEN** 核發日期為「中華民國1100913」
- **THEN** 轉換結果為 `2021-09-13`

#### Scenario: 有效期間
- **WHEN** 有效期間為「至120年08月31日止」
- **THEN** 到期日為 `2031-08-31`

### Requirement: 許可證狀態判定
系統 SHALL 為每個產品判定狀態：有效期間含「(已失效)」或到期日早於建置日為 `expired`；到期日不早於建置日為 `active`；有效期間空白或無法解析為 `unknown`。

#### Scenario: 來源標記失效
- **WHEN** 有效期間為「至99年12月31日止(已失效)」
- **THEN** 狀態為 `expired`

#### Scenario: 來源未標記但已過期
- **WHEN** 建置日為 2026-09-23，有效期間為「至115年06月30日止」且沒有「(已失效)」
- **THEN** 狀態為 `expired`

#### Scenario: 效期空白
- **WHEN** 有效期間為空字串
- **THEN** 狀態為 `unknown`

### Requirement: 產品分類
系統 SHALL 依劑型把產品分類為 `biologic`（劑型含「生物製劑」）、`raw-material`（劑型含「原料藥」）或 `general`（其他），並依外銷專用欄位設定 `exportOnly`。

#### Scenario: 疫苗
- **WHEN** 劑型為「生物製劑(液體)」
- **THEN** 分類為 `biologic`

#### Scenario: 原料藥
- **WHEN** 劑型為「原料藥(散劑)」
- **THEN** 分類為 `raw-material`

#### Scenario: 外銷專用
- **WHEN** 外銷專用為「是」
- **THEN** `exportOnly` 為 true

### Requirement: 劑型分層
系統 SHALL 把劑型拆為大類與子類：形如「大類(子類)」的直接拆分；沒有括號的依劑型對照表對應到大類。對照表未涵蓋的劑型以原文作為大類，並記入建置日誌。

#### Scenario: 含括號
- **WHEN** 劑型為「注射劑(乾粉注射劑)」
- **THEN** 大類為「注射劑」，子類為「乾粉注射劑」

#### Scenario: 依對照表
- **WHEN** 劑型為「注射液」，且對照表把「注射液」對應到「注射劑」
- **THEN** 大類為「注射劑」

### Requirement: 成分抽取與標準化
系統 SHALL 從非生物製劑產品的成分欄抽取成分清單：去除劑量、單位、括號內容與「EACH ML CONTAINS」「每瓶含有」等前綴，去除鹽類後綴（HCL、SULFATE、TRIHYDRATE、HYCLATE 等）得到基底名稱，再查同義詞表得到標準名稱與中文名。查不到的基底名稱 MUST 保留並標記為未驗證。每個產品 MUST 同時保留清理後的成分原文。成分數為 1 的產品標記為單方，2 以上為複方。生物製劑不做成分抽取。

#### Scenario: 拼法差異歸為同一成分
- **WHEN** 產品 X 成分為「AMOXICILLIN TRIHYDRATE 100 MG」，產品 Y 成分為「AMOXYCILLIN TRIHYDRATE」
- **THEN** 兩者的標準成分都是 `AMOXICILLIN`，都標記為單方

#### Scenario: 複方
- **WHEN** 成分為「LINCOMYCIN HCL 5GM<br/>SPECTINOMYCIN SULFATE 10GM」
- **THEN** 標準成分為 `LINCOMYCIN` 與 `SPECTINOMYCIN`，標記為複方

#### Scenario: 未收錄於同義詞表
- **WHEN** 抽出的基底名稱不在同義詞表中
- **THEN** 該成分以基底名稱保留，`verified` 為 false，並記入建置日誌的未對應清單

#### Scenario: 生物製劑
- **WHEN** 產品分類為 `biologic`
- **THEN** 標準成分清單為空，但仍保留成分原文

### Requirement: 物種與使用限制抽取
系統 SHALL 解析效能(適應症)欄位，以「物種字樣＋冒號」切段，產生結構化的物種適應症清單，每筆包含：標準物種、原文物種字樣、使用限制清單、是否為泛稱、該段適應症原文。一段有多個物種時 MUST 展開為多筆。系統 MUST 偵測「不含產蛋中之蛋雞」「不含蛋雞」「不含產蛋中之蛋鴨」「不含產蛋中之蛋禽」等字樣並記錄為限制；偵測到與產蛋相關的否定字樣但無法歸類時 MUST 保守地記錄為限制。

#### Scenario: 多段多物種
- **WHEN** 適應症為「豬：治療放線桿菌胸膜肺炎。雞（不含產蛋中之蛋雞）：治療大腸桿菌症。」
- **THEN** 產生兩筆：豬（無限制，適應症「治療放線桿菌胸膜肺炎」）、雞（限制 `not-laying-hens`，適應症「治療大腸桿菌症」）

#### Scenario: 一段多物種
- **WHEN** 適應症為「牛、馬、豬：治療細菌性感染症。」
- **THEN** 產生牛、馬、豬三筆，適應症相同

#### Scenario: 蛋禽泛稱限制
- **WHEN** 物種字樣為「雞、鴨（不含產蛋中之蛋禽）」
- **THEN** 雞帶有 `not-laying-hens` 限制，鴨帶有 `not-laying-ducks` 限制

#### Scenario: 泛稱
- **WHEN** 物種字樣為「家禽」
- **THEN** 依物種對照表展開為各成員物種，且 `generic` 為 true

#### Scenario: 水產以目保存
- **WHEN** 物種字樣為「鰻形目」
- **THEN** 標準物種為鰻形目，並歸屬「水產」群組

#### Scenario: 無冒號結構
- **WHEN** 適應症沒有「物種：」結構，但全文出現「犬」
- **THEN** 產生一筆犬的紀錄，其適應症為全文，並記入建置日誌

### Requirement: 建置日誌
系統 SHALL 在標準化結束時輸出統計日誌：總筆數、各狀態筆數、各分類筆數、略過的資料列、未對應的成分與物種字樣（依出現次數排序）、成分抽取失敗的產品數。

#### Scenario: 產出維護清單
- **WHEN** 標準化完成
- **THEN** 日誌列出前 50 個未對應成分及其產品數，供維護同義詞表

