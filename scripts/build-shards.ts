import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Product,
  Ingredient,
  ProductSummary,
  ProductShard,
  IngredientDetailShard,
} from '../src/types/drug.js';
import {
  shardOf,
  shardPath,
  DRUG_SHARDS,
  INGREDIENT_SHARDS,
} from '../src/lib/shard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const productsPath = path.join(projectRoot, 'data', 'products.json');
const ingredientsPath = path.join(projectRoot, 'data', 'ingredients.json');
const publicDataDir = path.join(projectRoot, 'public', 'data');
const drugShardsDir = path.join(publicDataDir, 'drug');
const ingredientShardsDir = path.join(publicDataDir, 'ingredient');

function cleanAndEnsureDir(dir: string) {
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, file));
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function buildShards() {
  console.log('[build-shards] 開始產生產品與成分分片...');

  if (!fs.existsSync(productsPath) || !fs.existsSync(ingredientsPath)) {
    console.error('[build-shards] 找不到 products.json 或 ingredients.json，請先執行 normalize');
    process.exit(1);
  }

  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const ingredients: Ingredient[] = JSON.parse(fs.readFileSync(ingredientsPath, 'utf8'));

  cleanAndEnsureDir(drugShardsDir);
  cleanAndEnsureDir(ingredientShardsDir);

  // 1. 產生產品分片 (DRUG_SHARDS = 128)
  const drugShards: ProductShard[] = Array.from({ length: DRUG_SHARDS }, () => ({}));

  for (const prod of products) {
    const shardIdx = shardOf(prod.slug, DRUG_SHARDS);
    drugShards[shardIdx][prod.slug] = prod;
  }

  let totalDrugShardBytes = 0;
  for (let i = 0; i < DRUG_SHARDS; i++) {
    const filePath = path.join(projectRoot, 'public', shardPath('drug', i));
    const content = JSON.stringify(drugShards[i]);
    fs.writeFileSync(filePath, content, 'utf8');
    totalDrugShardBytes += Buffer.byteLength(content, 'utf8');
  }

  // 2. 產生成分分片 (INGREDIENT_SHARDS = 64)
  // 建立成分 slug -> { ingredient, products: ProductSummary[] } 結構
  const ingredientMap = new Map<
    string,
    { ingredient: Ingredient; products: ProductSummary[] }
  >();

  for (const ing of ingredients) {
    ingredientMap.set(ing.slug, {
      ingredient: ing,
      products: [],
    });
  }

  // 成分分片只收一般藥品 (category === 'general')
  for (const prod of products) {
    if (prod.category !== 'general') continue;

    const summary: ProductSummary = {
      slug: prod.slug,
      licenseNo: prod.licenseNo,
      nameZh: prod.nameZh,
      nameEn: prod.nameEn,
      origin: prod.origin,
      category: prod.category,
      status: prod.status,
      expiryDate: prod.expiryDate,
      dosageFormCategory: prod.dosageForm.category,
      isSingleIngredient: prod.isSingleIngredient,
      ingredients: prod.ingredients.map((ing) => ({
        name: ing.name,
        slug: ing.slug,
        chineseName: ing.chineseName,
      })),
      speciesIndications: prod.speciesIndications.map((sp) => ({
        species: sp.species,
        label: sp.label,
        restrictions: sp.restrictions,
        generic: sp.generic,
      })),
      vendorName: prod.vendorName,
      exportOnly: prod.exportOnly,
    };

    const seenSlugsInProd = new Set<string>();
    for (const ing of prod.ingredients) {
      if (!ing.slug || seenSlugsInProd.has(ing.slug)) continue;
      seenSlugsInProd.add(ing.slug);

      const entry = ingredientMap.get(ing.slug);
      if (entry) {
        entry.products.push(summary);
      }
    }
  }

  const ingredientShards: IngredientDetailShard[] = Array.from(
    { length: INGREDIENT_SHARDS },
    () => ({})
  );

  for (const [slug, data] of ingredientMap.entries()) {
    const shardIdx = shardOf(slug, INGREDIENT_SHARDS);
    ingredientShards[shardIdx][slug] = data;
  }

  let totalIngredientShardBytes = 0;
  for (let i = 0; i < INGREDIENT_SHARDS; i++) {
    const filePath = path.join(projectRoot, 'public', shardPath('ingredient', i));
    const content = JSON.stringify(ingredientShards[i]);
    fs.writeFileSync(filePath, content, 'utf8');
    totalIngredientShardBytes += Buffer.byteLength(content, 'utf8');
  }

  const logPath = path.join(projectRoot, 'data', 'build-log.json');
  if (fs.existsSync(logPath)) {
    try {
      const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      logData.shards = {
        drugShards: DRUG_SHARDS,
        ingredientShards: INGREDIENT_SHARDS,
        totalDrugBytes: totalDrugShardBytes,
        totalIngredientBytes: totalIngredientShardBytes,
        avgDrugBytes: Math.round(totalDrugShardBytes / DRUG_SHARDS),
        avgIngredientBytes: Math.round(totalIngredientShardBytes / INGREDIENT_SHARDS),
      };
      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
    } catch {
      // 忽略 log 寫入失敗
    }
  }

  console.log('[build-shards] 分片產出完成：');
  console.log(
    `  - 產品分片: ${DRUG_SHARDS} 片，總大小 ${(totalDrugShardBytes / 1024 / 1024).toFixed(2)} MB (平均每片 ${(totalDrugShardBytes / DRUG_SHARDS / 1024).toFixed(1)} KB)`
  );
  console.log(
    `  - 成分分片: ${INGREDIENT_SHARDS} 片，總大小 ${(totalIngredientShardBytes / 1024 / 1024).toFixed(2)} MB (平均每片 ${(totalIngredientShardBytes / INGREDIENT_SHARDS / 1024).toFixed(1)} KB)`
  );
}

// 若直接執行則跑 buildShards()
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildShards();
}
