import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IngredientNormalizer } from '../src/lib/normalizer-ingredient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const synonyms = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'data', 'synonyms.json'), 'utf8')
);
const raw = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'data', 'raw.json'), 'utf8')
);

const norm = new IngredientNormalizer(synonyms);

const targets = ['TYLOSIN', 'AMOXICILLIN', 'FLORFENICOL'];
for (const target of targets) {
  console.log(`\n=== Checking 10 samples for ${target} ===`);
  let count = 0;
  for (const item of raw) {
    if (item['劑型'] && item['劑型'].includes('生物製劑')) continue;
    const res = norm.extractIngredients(item['成分']);
    if (res.ingredients.some((i) => i.name === target)) {
      count++;
      const names = res.ingredients.map(
        (i) => `${i.name}(${i.verified ? 'verified' : 'unverified'})`
      );
      console.log(
        `${count}. [${item['許可證字號']}] ${item['動物用藥品中文名稱']} -> ${names.join(', ')} (單方: ${res.isSingleIngredient})`
      );
      if (count >= 10) break;
    }
  }
}
