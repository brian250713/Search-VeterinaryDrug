/**
 * 任務 2.1／2.2：成分頁現有篩選與分組行為的保護測試（固定產品摘要資料）。
 * 已由暫時抽出的函式確認符合改動前行為，現改為驗證 src/lib/product-list.ts，
 * 斷言維持不變，確保搬移沒有改變成分頁行為。
 */
import { describe, it, expect } from 'vitest';
import { filterProducts, groupProducts } from '../src/lib/product-list';
import type { ProductSummary } from '../src/types/drug';

function makeSummary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    slug: 'm-test',
    licenseNo: '許可證字號',
    nameZh: '測試產品',
    nameEn: 'TEST',
    origin: '國產',
    category: 'general',
    status: 'active',
    expiryDate: '2030-01-01',
    dosageFormCategory: '注射劑',
    isSingleIngredient: true,
    ingredients: [{ name: 'TYLOSIN', slug: 'tylosin' }],
    speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false }],
    vendorName: '測試業者',
    factoryName: '測試製造廠',
    exportOnly: false,
    ...overrides,
  };
}

export const ingredientFixtures: ProductSummary[] = [
  makeSummary({
    slug: 'p1', origin: '國產', dosageFormCategory: '注射劑', status: 'active',
    isSingleIngredient: true,
    speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false }],
  }),
  makeSummary({
    slug: 'p2', origin: '輸入', dosageFormCategory: '散劑', status: 'active',
    isSingleIngredient: false,
    ingredients: [
      { name: 'TYLOSIN', slug: 'tylosin' },
      { name: 'SULFADIMIDINE', slug: 'sulfadimidine' },
    ],
    speciesIndications: [{ species: 'chicken', label: '雞', restrictions: [], generic: false }],
  }),
  makeSummary({
    slug: 'p3', origin: '國產', dosageFormCategory: '注射劑', status: 'active',
    isSingleIngredient: true,
    speciesIndications: [
      { species: 'chicken', label: '雞', restrictions: ['not-laying-hens'], generic: false },
    ],
  }),
  makeSummary({
    slug: 'p4', origin: '國產', dosageFormCategory: '散劑', status: 'expired',
    isSingleIngredient: true,
    speciesIndications: [
      { species: 'duck', label: '鴨', restrictions: ['not-laying-ducks'], generic: false },
    ],
  }),
  makeSummary({
    slug: 'p5', origin: '輸入', dosageFormCategory: '口服液劑', status: 'active',
    isSingleIngredient: false,
    ingredients: [
      { name: 'TYLOSIN', slug: 'tylosin' },
      { name: 'DOXYCYCLINE', slug: 'doxycycline' },
    ],
    speciesIndications: [{ species: 'eel-order', label: '鰻形目', restrictions: [], generic: false }],
  }),
  makeSummary({
    slug: 'p6', origin: '國產', dosageFormCategory: '注射劑', status: 'unknown',
    expiryDate: null, isSingleIngredient: true,
    speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false }],
  }),
  makeSummary({
    slug: 'p7', origin: '國產', dosageFormCategory: '', status: 'active',
    isSingleIngredient: true,
    speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false }],
  }),
];

function slugs(list: { slug: string }[]): string[] {
  return list.map((p) => p.slug);
}

describe('成分頁篩選行為保護 (task 2.1/2.2)', () => {
  it('預設排除已失效，保留效期未載明', () => {
    const { items } = filterProducts(ingredientFixtures, {});
    expect(slugs(items)).toEqual(['p1', 'p2', 'p3', 'p5', 'p6', 'p7']);
  });

  it('勾選包含已失效後全部出現', () => {
    const { items } = filterProducts(ingredientFixtures, { includeExpired: true });
    expect(slugs(items)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
  });

  it('物種篩選：豬', () => {
    const { items } = filterProducts(ingredientFixtures, { species: 'pig' });
    expect(slugs(items)).toEqual(['p1', 'p6', 'p7']);
  });

  it('物種篩選：水產', () => {
    const { items } = filterProducts(ingredientFixtures, { species: 'aquatic' });
    expect(slugs(items)).toEqual(['p5']);
  });

  it('蛋雞篩選：排除標記產品並計數', () => {
    const { items, excludedLayingCount } = filterProducts(ingredientFixtures, {
      species: 'laying-hen',
    });
    expect(slugs(items)).toEqual(['p2']);
    expect(excludedLayingCount).toBe(1);
  });

  it('蛋雞篩選：展開後含標記產品', () => {
    const { items } = filterProducts(ingredientFixtures, {
      species: 'laying-hen',
      expandLaying: true,
    });
    expect(slugs(items)).toEqual(['p2', 'p3']);
  });

  it('蛋鴨篩選：已失效的標記產品先被效期排除，不計入蛋鴨排除數', () => {
    const { items, excludedLayingCount } = filterProducts(ingredientFixtures, {
      species: 'laying-duck',
    });
    expect(slugs(items)).toEqual([]);
    expect(excludedLayingCount).toBe(0);
  });

  it('劑型篩選', () => {
    const { items } = filterProducts(ingredientFixtures, { dosageCategory: '注射劑' });
    expect(slugs(items)).toEqual(['p1', 'p3', 'p6']);
  });

  it('產地篩選：輸入', () => {
    const { items } = filterProducts(ingredientFixtures, { origin: '輸入' });
    expect(slugs(items)).toEqual(['p2', 'p5']);
  });
});

describe('成分頁分組行為保護 (task 2.1/2.2)', () => {
  it('單方／複方分組正確', () => {
    const { items } = filterProducts(ingredientFixtures, {});
    const grouped = groupProducts(items);
    expect(slugs(grouped.single.flatMap((g) => g.products))).toEqual(['p1', 'p3', 'p6', 'p7']);
    expect(slugs(grouped.compound.flatMap((g) => g.products))).toEqual(['p2', 'p5']);
  });

  it('劑型分組維持首次出現順序，空白劑型歸入其他劑型', () => {
    const { items } = filterProducts(ingredientFixtures, {});
    const grouped = groupProducts(items);
    expect(grouped.single.map((g) => g.category)).toEqual(['注射劑', '其他劑型']);
    expect(slugs(grouped.single[0].products)).toEqual(['p1', 'p3', 'p6']);
    expect(slugs(grouped.single[1].products)).toEqual(['p7']);
  });
});
