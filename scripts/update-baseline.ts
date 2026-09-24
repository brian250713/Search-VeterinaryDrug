import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const rawPath = path.join(projectRoot, 'data', 'raw.json');
const baselinePath = path.join(projectRoot, 'data', 'baseline.json');

function main() {
  if (!fs.existsSync(rawPath)) {
    console.error('raw.json 不存在，無法更新基準筆數');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const count = raw.length;

  const baseline = {
    totalRecords: count,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), 'utf8');
  console.log(`[baseline] 已更新 baseline.json 基準筆數為: ${count}`);
}

main();
