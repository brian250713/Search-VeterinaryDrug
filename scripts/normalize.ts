import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  RawRecord,
  Product,
  Ingredient,
  Meta,
} from '../src/types/drug.js';
import {
  parseLicenseNo,
  cleanHtml,
  parseRocDate,
  determineStatus,
  determineCategory,
  parseDosageForm,
  parseExportOnly,
} from '../src/lib/normalizer-basic.js';
import { IngredientNormalizer, toIngredientSlug, aggregateIngredients } from '../src/lib/normalizer-ingredient.js';
import { SpeciesNormalizer } from '../src/lib/normalizer-species.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');

const rawPath = path.join(dataDir, 'raw.json');
const synonymsPath = path.join(dataDir, 'synonyms.json');
const speciesMapPath = path.join(dataDir, 'species-map.json');
const dosageMapPath = path.join(dataDir, 'dosage-form-map.json');

const productsOutPath = path.join(dataDir, 'products.json');
const ingredientsOutPath = path.join(dataDir, 'ingredients.json');
const metaOutPath = path.join(dataDir, 'meta.json');
const logOutPath = path.join(dataDir, 'build-log.json');

function main() {
  console.log('[normalize] 開始執行資料標準化與資料集產出...');

  if (!fs.existsSync(rawPath)) {
    console.error(`[normalize] 找不到 ${rawPath}，請先執行 pnpm fetch`);
    process.exit(1);
  }

  const rawData: RawRecord[] = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const synonymsData = JSON.parse(fs.readFileSync(synonymsPath, 'utf8'));
  const speciesMapData = JSON.parse(fs.readFileSync(speciesMapPath, 'utf8'));
  const dosageMapData = fs.existsSync(dosageMapPath)
    ? JSON.parse(fs.readFileSync(dosageMapPath, 'utf8'))
    : {};

  const ingredientNorm = new IngredientNormalizer(synonymsData);
  const speciesNorm = new SpeciesNormalizer(speciesMapData);

  const skippedRecords: { index: number; reason: string; record: Partial<RawRecord> }[] = [];
  const duplicateMap: Map<string, { lastIndex: number; count: number }> = new Map();
  const validRecordsBySlug: Map<string, { raw: RawRecord; index: number }> = new Map();

  for (let i = 0; i < rawData.length; i++) {
    const raw = rawData[i];
    const parsedLic = parseLicenseNo(raw['許可證字號']);
    if (!parsedLic) {
      skippedRecords.push({
        index: i,
        reason: '空白或無法解析的許可證字號',
        record: {
          許可證字號: raw['許可證字號'],
          動物用藥品中文名稱: raw['動物用藥品中文名稱'],
        },
      });
      continue;
    }

    const { slug } = parsedLic;
    if (validRecordsBySlug.has(slug)) {
      const prev = duplicateMap.get(slug) || { lastIndex: i, count: 1 };
      prev.count++;
      prev.lastIndex = i;
      duplicateMap.set(slug, prev);
    }

    // 保留最後一筆
    validRecordsBySlug.set(slug, { raw, index: i });
  }

  console.log(
    `[normalize] 原始資料 ${rawData.length} 筆，略過 ${skippedRecords.length} 筆，重複覆蓋 ${duplicateMap.size} 筆，有效產品 ${validRecordsBySlug.size} 筆。`
  );

  const products: Product[] = [];
  const unverifiedIngredientCounts: Map<string, number> = new Map();
  let ingredientExtractionFailCount = 0;

  for (const [slug, { raw }] of validRecordsBySlug.entries()) {
    const lic = parseLicenseNo(raw['許可證字號'])!;
    const category = determineCategory(raw['劑型']);
    const isBiologic = category === 'biologic';
    const exportOnly = parseExportOnly(raw['外銷專用']);

    const { status, expiryDate } = determineStatus(raw['有效期間']);
    const issueDate = parseRocDate(raw['核發日期']);
    const dosageForm = parseDosageForm(raw['劑型'], dosageMapData);

    const ingRes = ingredientNorm.extractIngredients(raw['成分'], isBiologic);
    if (!isBiologic && ingRes.ingredients.length === 0) {
      ingredientExtractionFailCount++;
    }

    for (const ing of ingRes.ingredients) {
      if (!ing.verified) {
        unverifiedIngredientCounts.set(
          ing.name,
          (unverifiedIngredientCounts.get(ing.name) || 0) + 1
        );
      }
    }

    const spRes = speciesNorm.extractSpeciesIndications(raw['效能(適應症)']);

    const product: Product = {
      slug: lic.slug,
      licenseNo: lic.licenseNo,
      origin: lic.origin,
      category,
      exportOnly,
      nameZh: cleanHtml(raw['動物用藥品中文名稱']),
      nameEn: cleanHtml(raw['動物用藥品英文名稱']),
      vendorName: cleanHtml(raw['業者名稱']),
      vendorAddress: cleanHtml(raw['業者地址']),
      factoryName: cleanHtml(raw['製造廠名稱']),
      factoryAddress: cleanHtml(raw['製造廠地址']),
      dosageForm,
      package: cleanHtml(raw['包裝']),
      status,
      issueDate,
      expiryDate,
      isSingleIngredient: ingRes.isSingleIngredient,
      ingredients: ingRes.ingredients,
      ingredientsText: ingRes.cleanedText,
      speciesIndications: spRes.indications,
      indicationText: spRes.cleanedText,
    };

    products.push(product);
  }

  // 統計與彙總 Ingredient (以 slug 為 key 合併)
  const ingredientsList: Ingredient[] = aggregateIngredients(products);

  // 統計 Meta
  const meta: Meta = {
    fetchedAt: new Date().toISOString(),
    normalizedAt: new Date().toISOString(),
    totalRecords: products.length,
    activeRecords: products.filter((p) => p.status === 'active').length,
    expiredRecords: products.filter((p) => p.status === 'expired').length,
    unknownRecords: products.filter((p) => p.status === 'unknown').length,
    generalRecords: products.filter((p) => p.category === 'general').length,
    biologicRecords: products.filter((p) => p.category === 'biologic').length,
    rawMaterialRecords: products.filter((p) => p.category === 'raw-material').length,
    exportOnlyRecords: products.filter((p) => p.exportOnly).length,
  };

  // 建置日誌
  const topUnverifiedIngredients = Array.from(unverifiedIngredientCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => ({ name, count }));

  const topUnmappedSpecies = Array.from(speciesNorm.unmappedWords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  const buildLog = {
    meta,
    skippedCount: skippedRecords.length,
    skippedRecords,
    duplicateCount: duplicateMap.size,
    duplicateLicenses: Array.from(duplicateMap.entries()).map(([slug, info]) => ({
      slug,
      ...info,
    })),
    ingredientExtractionFailCount,
    topUnverifiedIngredients,
    topUnmappedSpecies,
  };

  // 寫入檔案
  fs.writeFileSync(productsOutPath, JSON.stringify(products), 'utf8');
  fs.writeFileSync(ingredientsOutPath, JSON.stringify(ingredientsList), 'utf8');
  fs.writeFileSync(metaOutPath, JSON.stringify(meta, null, 2), 'utf8');
  fs.writeFileSync(logOutPath, JSON.stringify(buildLog, null, 2), 'utf8');

  // 移除舊的 compare-data.json (若存在)
  const legacyCompareDataPaths = [
    path.join(dataDir, 'compare-data.json'),
    path.join(projectRoot, 'public', 'data', 'compare-data.json'),
  ];
  for (const p of legacyCompareDataPaths) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`[normalize] 已刪除舊 compare-data.json: ${p}`);
    }
  }

  console.log('[normalize] 建置產出完成：');
  console.log(`  - 產品數: ${products.length}`);
  console.log(`  - 有效狀態: active=${meta.activeRecords}, expired=${meta.expiredRecords}, unknown=${meta.unknownRecords}`);
  console.log(`  - 分類: general=${meta.generalRecords}, biologic=${meta.biologicRecords}, raw=${meta.rawMaterialRecords}`);
  console.log(`  - 外銷專用: ${meta.exportOnlyRecords}`);
  console.log(`  - 標準成分數 (去重 slug): ${ingredientsList.length}`);
  console.log(`  - 檔案已輸出至: products.json, ingredients.json, meta.json, build-log.json`);
}

main();
