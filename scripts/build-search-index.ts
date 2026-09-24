import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';
import type { Product } from '../src/types/drug.js';
import { cjkBigramTokenizer } from '../src/lib/search-tokenizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const productsPath = path.join(projectRoot, 'data', 'products.json');
const publicDataDir = path.join(projectRoot, 'public', 'data');
const searchIndexPath = path.join(publicDataDir, 'search-index.json');
const expiredIndexPath = path.join(publicDataDir, 'expired-search-index.json');

function createIndexFor(products: Product[]) {
  const miniSearch = new MiniSearch({
    idField: 'slug',
    fields: ['nameZh', 'ingredientsText', 'nameEn', 'licenseNo', 'vendorName'],
    storeFields: [
      'slug',
      'licenseNo',
      'nameZh',
      'nameEn',
      'origin',
      'category',
      'status',
      'expiryDate',
      'dosageFormCategory',
      'dosageFormRaw',
      'vendorName',
      'isSingleIngredient',
      'ingredients',
      'speciesIndications',
      'exportOnly',
    ],
    tokenize: cjkBigramTokenizer,
  });

  const docs = products.map((p) => {
    const ingNames = p.ingredients.map((i) => `${i.name} ${i.chineseName || ''}`).join(' ');
    return {
      slug: p.slug,
      licenseNo: p.licenseNo,
      nameZh: p.nameZh,
      nameEn: p.nameEn,
      origin: p.origin,
      category: p.category,
      status: p.status,
      expiryDate: p.expiryDate,
      dosageFormCategory: p.dosageForm.category,
      dosageFormRaw: p.dosageForm.raw,
      vendorName: p.vendorName,
      isSingleIngredient: p.isSingleIngredient,
      ingredients: p.ingredients,
      speciesIndications: p.speciesIndications,
      exportOnly: p.exportOnly,
      ingredientsText: `${ingNames} ${p.ingredientsText}`,
    };
  });

  miniSearch.addAll(docs);
  return miniSearch;
}

function main() {
  console.log('[build-index] 開始建置 MiniSearch 索引 (依 Design D10 降級策略分拆)...');

  if (!fs.existsSync(productsPath)) {
    console.error('products.json 不存在');
    process.exit(1);
  }

  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  const activeOrUnknown = products.filter((p) => p.status !== 'expired');
  const expiredProducts = products.filter((p) => p.status === 'expired');

  console.log(`[build-index] 有效與未載明產品: ${activeOrUnknown.length} 筆，已失效產品: ${expiredProducts.length} 筆`);

  // Build main index
  const mainIndex = createIndexFor(activeOrUnknown);
  const mainSerialized = JSON.stringify(mainIndex);
  const mainGzipped = zlib.gzipSync(Buffer.from(mainSerialized, 'utf8'));
  const mainGzipMb = mainGzipped.length / (1024 * 1024);

  console.log(`[build-index] 主索引大小: 原始 ${(mainSerialized.length / (1024 * 1024)).toFixed(2)} MB, gzip: ${mainGzipMb.toFixed(2)} MB`);

  if (mainGzipMb <= 1.5) {
    console.log(`[build-index] ✓ 主索引符合效能預算 (${mainGzipMb.toFixed(2)} MB <= 1.5 MB)`);
  } else {
    console.warn(`[build-index] ⚠️ 主索引大小: ${mainGzipMb.toFixed(2)} MB`);
  }

  // Build expired index
  const expiredIndex = createIndexFor(expiredProducts);
  const expiredSerialized = JSON.stringify(expiredIndex);

  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  fs.writeFileSync(searchIndexPath, mainSerialized, 'utf8');
  fs.writeFileSync(expiredIndexPath, expiredSerialized, 'utf8');

  console.log(`[build-index] 主索引已儲存至: ${searchIndexPath}`);
  console.log(`[build-index] 失效索引已儲存至: ${expiredIndexPath}`);
}

main();
