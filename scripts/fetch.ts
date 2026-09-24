import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllRecords } from '../src/lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dataDir = path.join(projectRoot, 'data');
const baselinePath = path.join(dataDir, 'baseline.json');
const rawPath = path.join(dataDir, 'raw.json');

async function main() {
  console.log('[fetch] 開始執行動物用藥品資料擷取...');

  let baselineCount: number | undefined;
  if (fs.existsSync(baselinePath)) {
    try {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      baselineCount = baseline.totalRecords;
      console.log(`[fetch] 基準筆數: ${baselineCount}`);
    } catch (e) {
      console.warn('[fetch] 警告：無法解析 baseline.json，將不進行筆數下降檢查');
    }
  }

  try {
    const records = await fetchAllRecords({
      baselineCount,
      onProgress: (count, page) => {
        console.log(`[fetch] 第 ${page} 頁抓取完成，累積 ${count} 筆...`);
      },
    });

    console.log(`[fetch] 抓取完成並通過防呆驗證！共 ${records.length} 筆。`);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(rawPath, JSON.stringify(records, null, 2), 'utf-8');
    console.log(`[fetch] 已成功寫入 ${rawPath}`);
  } catch (error: any) {
    console.error(`[fetch] 錯誤：資料擷取流程失敗 - ${error.message}`);
    process.exit(1);
  }
}

main();
