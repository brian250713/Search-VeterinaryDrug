import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Product, Ingredient } from '../src/types/drug.js';
import { shardOf, shardPath, DRUG_SHARDS, INGREDIENT_SHARDS } from '../src/lib/shard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'dist');
const dataDir = path.join(projectRoot, 'data');
const productsPath = path.join(dataDir, 'products.json');
const ingredientsPath = path.join(dataDir, 'ingredients.json');

function main() {
  console.log('[verify] 開始執行建置與發布驗證 (Release Verification)...');

  // 1. 驗證 ingredients.json 中沒有重複的 slug
  console.log('[verify] 1. 檢查成分 slug 唯一性...');
  if (!fs.existsSync(ingredientsPath)) {
    throw new Error(`找不到 ${ingredientsPath}`);
  }
  const ingredients: Ingredient[] = JSON.parse(fs.readFileSync(ingredientsPath, 'utf8'));
  const seenIngSlugs = new Set<string>();
  const duplicateIngSlugs: string[] = [];
  for (const ing of ingredients) {
    if (seenIngSlugs.has(ing.slug)) {
      duplicateIngSlugs.push(ing.slug);
    }
    seenIngSlugs.add(ing.slug);
  }
  if (duplicateIngSlugs.length > 0) {
    throw new Error(`驗證失敗: 成分 slug 存在重複項目: ${duplicateIngSlugs.join(', ')}`);
  }
  console.log(`[verify] ✓ 成分 slug 全部唯一 (共 ${ingredients.length} 項成分)`);

  // 2. 檢查分片檔案數量 (優先檢查 dist，若無則檢查 public)
  const targetRoot = fs.existsSync(distDir)
    ? distDir
    : path.join(projectRoot, 'public');
  console.log(`[verify] 2. 檢查分片數量 (目錄: ${targetRoot})...`);

  const drugDir = path.join(targetRoot, 'data', 'drug');
  const ingredientDir = path.join(targetRoot, 'data', 'ingredient');

  if (!fs.existsSync(drugDir)) {
    throw new Error(`驗證失敗: 找不到產品分片目錄 ${drugDir}`);
  }
  const drugShardFiles = fs.readdirSync(drugDir).filter((f) => f.endsWith('.json'));
  if (drugShardFiles.length !== DRUG_SHARDS) {
    throw new Error(`驗證失敗: 產品分片數量應為 ${DRUG_SHARDS}，實際為 ${drugShardFiles.length}`);
  }
  console.log(`[verify] ✓ 產品分片數量正確 (${DRUG_SHARDS} 片)`);

  if (!fs.existsSync(ingredientDir)) {
    throw new Error(`驗證失敗: 找不到成分分片目錄 ${ingredientDir}`);
  }
  const ingredientShardFiles = fs.readdirSync(ingredientDir).filter((f) => f.endsWith('.json'));
  if (ingredientShardFiles.length !== INGREDIENT_SHARDS) {
    throw new Error(`驗證失敗: 成分分片數量應為 ${INGREDIENT_SHARDS}，實際為 ${ingredientShardFiles.length}`);
  }
  console.log(`[verify] ✓ 成分分片數量正確 (${INGREDIENT_SHARDS} 片)`);

  // 3. 抽樣產品與成分 slug，驗證能在 shardOf 算出的分片中找到
  console.log('[verify] 3. 抽樣比對產品與成分分片雜湊對應...');
  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  // 抽樣 30 筆產品
  const sampleProducts = products.slice(0, 30);
  for (const prod of sampleProducts) {
    const shardIdx = shardOf(prod.slug, DRUG_SHARDS);
    const shardFile = path.join(targetRoot, shardPath('drug', shardIdx));
    if (!fs.existsSync(shardFile)) {
      throw new Error(`驗證失敗: 產品分片檔案不存在: ${shardFile}`);
    }
    const shardContent = JSON.parse(fs.readFileSync(shardFile, 'utf8'));
    if (!shardContent[prod.slug]) {
      throw new Error(`驗證失敗: 產品 ${prod.slug} 無法在分片 ${shardIdx} (${shardFile}) 中找到`);
    }
  }
  console.log(`[verify] ✓ 抽樣 ${sampleProducts.length} 筆產品皆可在對應分片正確找到`);

  // 抽樣 30 筆成分
  const sampleIngredients = ingredients.slice(0, 30);
  for (const ing of sampleIngredients) {
    const shardIdx = shardOf(ing.slug, INGREDIENT_SHARDS);
    const shardFile = path.join(targetRoot, shardPath('ingredient', shardIdx));
    if (!fs.existsSync(shardFile)) {
      throw new Error(`驗證失敗: 成分分片檔案不存在: ${shardFile}`);
    }
    const shardContent = JSON.parse(fs.readFileSync(shardFile, 'utf8'));
    if (!shardContent[ing.slug]) {
      throw new Error(`驗證失敗: 成分 ${ing.slug} 無法在分片 ${shardIdx} (${shardFile}) 中找到`);
    }
  }
  console.log(`[verify] ✓ 抽樣 ${sampleIngredients.length} 筆成分皆可在對應分片正確找到`);

  // 4. 若 distDir 存在，驗證 HTML 產出結構
  if (fs.existsSync(distDir)) {
    console.log('[verify] 4. 驗證 dist 產出結構...');

    const distDrugIndex = path.join(distDir, 'drug', 'index.html');
    const distIngredientIndex = path.join(distDir, 'ingredient', 'index.html');

    if (!fs.existsSync(distDrugIndex)) {
      throw new Error(`驗證失敗: 找不到 ${distDrugIndex}`);
    }
    if (!fs.existsSync(distIngredientIndex)) {
      throw new Error(`驗證失敗: 找不到 ${distIngredientIndex}`);
    }
    console.log('[verify] ✓ dist/drug/index.html 與 dist/ingredient/index.html 均存在');

    // 檢查 dist/drug/ 與 dist/ingredient/ 底下沒有子目錄
    const distDrugEntries = fs.readdirSync(path.join(distDir, 'drug'), { withFileTypes: true });
    const drugSubDirs = distDrugEntries.filter((e) => e.isDirectory());
    if (drugSubDirs.length > 0) {
      throw new Error(`驗證失敗: dist/drug/ 底下不應有子目錄，但發現: ${drugSubDirs.map((d) => d.name).join(', ')}`);
    }

    const distIngEntries = fs.readdirSync(path.join(distDir, 'ingredient'), { withFileTypes: true });
    const ingSubDirs = distIngEntries.filter((e) => e.isDirectory());
    if (ingSubDirs.length > 0) {
      throw new Error(`驗證失敗: dist/ingredient/ 底下不應有子目錄，但發現: ${ingSubDirs.map((d) => d.name).join(', ')}`);
    }
    console.log('[verify] ✓ dist/drug/ 與 dist/ingredient/ 底下均無子目錄 (單一殼頁模式生效)');

    // 檢查 dist/data/compare-data.json 不存在
    const legacyCompareDataDist = path.join(distDir, 'data', 'compare-data.json');
    if (fs.existsSync(legacyCompareDataDist)) {
      throw new Error(`驗證失敗: dist/data/compare-data.json 仍殘留存在`);
    }
    console.log('[verify] ✓ dist/data/compare-data.json 已移除');
  }

  console.log('[verify] 全部發布驗證通過！');
}

main();
