import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Product,
  Ingredient,
  ProductSummary,
  CompanyProductSummary,
  CompanyDetailShard,
  CompanyRole,
  CompanySummary,
  ProductShard,
  IngredientDetailShard,
} from '../src/types/drug.js';
import {
  shardOf,
  shardPath,
  DRUG_SHARDS,
  INGREDIENT_SHARDS,
  COMPANY_SHARDS,
} from '../src/lib/shard.js';
import { normalizeCompanyName } from '../src/lib/company.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const productsPath = path.join(projectRoot, 'data', 'products.json');
const ingredientsPath = path.join(projectRoot, 'data', 'ingredients.json');
const publicDataDir = path.join(projectRoot, 'public', 'data');
const drugShardsDir = path.join(publicDataDir, 'drug');
const ingredientShardsDir = path.join(publicDataDir, 'ingredient');
const companyShardsDir = path.join(publicDataDir, 'company');

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
  cleanAndEnsureDir(companyShardsDir);

  function toSummary(prod: Product): ProductSummary {
    return {
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
      factoryName: prod.factoryName,
      exportOnly: prod.exportOnly,
    };
  }

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

    const summary: ProductSummary = toSummary(prod);

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

  // 3. 產生公司分片 (COMPANY_SHARDS = 64)：收錄所有類別
  // key 為正規化後的公司名稱；同一家公司在同一產品下只列一次並記錄 roles
  interface CompanyAcc {
    name: string;
    addressCounts: Map<string, number>;
    products: Map<string, CompanyProductSummary>;
    vendorCount: number;
    factoryCount: number;
  }

  const companyMap = new Map<string, CompanyAcc>();

  function getCompanyAcc(name: string): CompanyAcc {
    let acc = companyMap.get(name);
    if (!acc) {
      acc = { name, addressCounts: new Map(), products: new Map(), vendorCount: 0, factoryCount: 0 };
      companyMap.set(name, acc);
    }
    return acc;
  }

  function addCompanyProduct(acc: CompanyAcc, prod: Product, role: CompanyRole, address: string) {
    const trimmedAddr = (address || '').trim();
    if (trimmedAddr) {
      acc.addressCounts.set(trimmedAddr, (acc.addressCounts.get(trimmedAddr) || 0) + 1);
    }
    if (role === 'vendor') acc.vendorCount++;
    else acc.factoryCount++;

    let summary = acc.products.get(prod.slug);
    if (!summary) {
      summary = { ...toSummary(prod), roles: [] };
      acc.products.set(prod.slug, summary);
    }
    if (!summary.roles.includes(role)) {
      summary.roles.push(role);
    }
  }

  for (const prod of products) {
    const vendorKey = normalizeCompanyName(prod.vendorName);
    const factoryKey = normalizeCompanyName(prod.factoryName);

    // 空白名稱不建立公司
    if (vendorKey) {
      addCompanyProduct(getCompanyAcc(vendorKey), prod, 'vendor', prod.vendorAddress);
    }
    if (factoryKey) {
      addCompanyProduct(getCompanyAcc(factoryKey), prod, 'factory', prod.factoryAddress);
    }
  }

  const companyShards: CompanyDetailShard[] = Array.from(
    { length: COMPANY_SHARDS },
    () => ({})
  );

  for (const acc of companyMap.values()) {
    const addresses = [...acc.addressCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([addr]) => addr);
    const shardIdx = shardOf(acc.name, COMPANY_SHARDS);
    companyShards[shardIdx][acc.name] = {
      company: {
        name: acc.name,
        addresses,
        vendorCount: acc.vendorCount,
        factoryCount: acc.factoryCount,
      },
      products: [...acc.products.values()],
    };
  }

  let totalCompanyShardBytes = 0;
  let maxCompanyShardBytes = 0;
  for (let i = 0; i < COMPANY_SHARDS; i++) {
    const filePath = path.join(projectRoot, 'public', shardPath('company', i));
    const content = JSON.stringify(companyShards[i]);
    fs.writeFileSync(filePath, content, 'utf8');
    const size = Buffer.byteLength(content, 'utf8');
    totalCompanyShardBytes += size;
    if (size > maxCompanyShardBytes) maxCompanyShardBytes = size;
  }

  // 4. 輸出公司摘要清單 data/companies.json（與公司分片同一次彙整，供公司總覽頁建置時靜態渲染）
  const companies: CompanySummary[] = [...companyMap.values()].map((acc) => {
    let activeCount = 0;
    for (const summary of acc.products.values()) {
      if (summary.status !== 'expired') activeCount++;
    }
    return {
      name: acc.name,
      productCount: acc.products.size,
      activeCount,
      vendorCount: acc.vendorCount,
      factoryCount: acc.factoryCount,
    };
  });
  companies.sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, 'zh-Hant'));
  fs.writeFileSync(
    path.join(projectRoot, 'data', 'companies.json'),
    JSON.stringify(companies, null, 2),
    'utf8'
  );

  const logPath = path.join(projectRoot, 'data', 'build-log.json');
  if (fs.existsSync(logPath)) {
    try {
      const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      logData.shards = {
        drugShards: DRUG_SHARDS,
        ingredientShards: INGREDIENT_SHARDS,
        companyShards: COMPANY_SHARDS,
        companyCount: companyMap.size,
        totalDrugBytes: totalDrugShardBytes,
        totalIngredientBytes: totalIngredientShardBytes,
        totalCompanyBytes: totalCompanyShardBytes,
        avgDrugBytes: Math.round(totalDrugShardBytes / DRUG_SHARDS),
        avgIngredientBytes: Math.round(totalIngredientShardBytes / INGREDIENT_SHARDS),
        avgCompanyBytes: Math.round(totalCompanyShardBytes / COMPANY_SHARDS),
        maxCompanyBytes: maxCompanyShardBytes,
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
  console.log(
    `  - 公司分片: ${COMPANY_SHARDS} 片，公司數 ${companyMap.size}，總大小 ${(totalCompanyShardBytes / 1024 / 1024).toFixed(2)} MB (平均每片 ${(totalCompanyShardBytes / COMPANY_SHARDS / 1024).toFixed(1)} KB，最大單片 ${(maxCompanyShardBytes / 1024).toFixed(1)} KB)`
  );
  console.log(`  - 公司摘要: data/companies.json，共 ${companies.length} 家公司`);
}

// 若直接執行則跑 buildShards()
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildShards();
}
