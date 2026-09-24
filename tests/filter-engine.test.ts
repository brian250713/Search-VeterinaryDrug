import { describe, it, expect } from 'vitest';
import { filterProducts } from '../src/lib/filter-engine.js';
import type { Product } from '../src/types/drug.js';

function createDummyProduct(overrides: Partial<Product> = {}): Product {
  return {
    slug: 'm-00001',
    licenseNo: '動物藥製字第00001號',
    origin: '國產',
    category: 'general',
    exportOnly: false,
    nameZh: '測試產品',
    nameEn: 'TEST PRODUCT',
    vendorName: '測試藥廠',
    vendorAddress: '台北市',
    factoryName: '測試製造廠',
    factoryAddress: '台北市',
    dosageForm: { raw: '注射劑(注射劑)', category: '注射劑' },
    package: '100ML',
    status: 'active',
    issueDate: '2020-01-01',
    expiryDate: '2030-01-01',
    isSingleIngredient: true,
    ingredients: [{ name: 'TYLOSIN', chineseName: '泰樂黴素', originalText: 'TYLOSIN', verified: true, slug: 'tylosin' }],
    ingredientsText: 'TYLOSIN 100MG',
    speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false, indication: '治療下痢' }],
    indicationText: '豬：治療下痢',
    ...overrides,
  };
}

describe('Filter Engine (specs/drug-search)', () => {
  it('default excludes expired, biologic, raw-material, exportOnly, but retains unknown', () => {
    const p1 = createDummyProduct({ slug: 'p1', status: 'active' });
    const p2 = createDummyProduct({ slug: 'p2', status: 'expired' });
    const p3 = createDummyProduct({ slug: 'p3', status: 'unknown' });
    const p4 = createDummyProduct({ slug: 'p4', category: 'biologic' });
    const p5 = createDummyProduct({ slug: 'p5', category: 'raw-material' });
    const p6 = createDummyProduct({ slug: 'p6', exportOnly: true });

    const res = filterProducts([p1, p2, p3, p4, p5, p6]);

    expect(res.items.map((i) => i.slug)).toEqual(['p1', 'p3']);
    expect(res.hiddenExpiredCount).toBe(1);
  });

  it('includes expired when includeExpired is true', () => {
    const p1 = createDummyProduct({ slug: 'p1', status: 'active' });
    const p2 = createDummyProduct({ slug: 'p2', status: 'expired' });

    const res = filterProducts([p1, p2], { includeExpired: true });
    expect(res.items.map((i) => i.slug)).toEqual(['p1', 'p2']);
    expect(res.hiddenExpiredCount).toBe(0);
  });

  it('filters by origin, dosageCategory, single/compound', () => {
    const p1 = createDummyProduct({ slug: 'p1', origin: '國產', isSingleIngredient: true, dosageForm: { raw: '注射液', category: '注射劑' } });
    const p2 = createDummyProduct({ slug: 'p2', origin: '輸入', isSingleIngredient: false, dosageForm: { raw: '散劑', category: '散劑' } });

    const resOrigin = filterProducts([p1, p2], { origin: '國產' });
    expect(resOrigin.items.map((i) => i.slug)).toEqual(['p1']);

    const resDosage = filterProducts([p1, p2], { dosageCategory: '散劑' });
    expect(resDosage.items.map((i) => i.slug)).toEqual(['p2']);

    const resSingle = filterProducts([p1, p2], { ingredientType: 'single' });
    expect(resSingle.items.map((i) => i.slug)).toEqual(['p1']);
  });

  it('handles laying-hen filtering and excluded count', () => {
    // p1: general chicken (no restriction)
    const p1 = createDummyProduct({
      slug: 'p1',
      speciesIndications: [{ species: 'chicken', label: '肉雞', restrictions: [], generic: false, indication: '感染' }],
    });
    // p2: chicken with not-laying-hens
    const p2 = createDummyProduct({
      slug: 'p2',
      speciesIndications: [{ species: 'chicken', label: '雞（不含產蛋中之蛋雞）', restrictions: ['not-laying-hens'], generic: false, indication: '感染' }],
    });
    // p3: pig only
    const p3 = createDummyProduct({
      slug: 'p3',
      speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false, indication: '感染' }],
    });

    // 1. Filter by 'laying-hen' default (expand = false)
    const resLaying = filterProducts([p1, p2, p3], { species: 'laying-hen' });
    expect(resLaying.items.map((i) => i.slug)).toEqual(['p1']);
    expect(resLaying.excludedLayingCount).toBe(1);

    // 2. Filter by 'laying-hen' with expandRestrictedLaying = true
    const resExpanded = filterProducts([p1, p2, p3], { species: 'laying-hen', expandRestrictedLaying: true });
    expect(resExpanded.items.map((i) => i.slug)).toEqual(['p1', 'p2']);

    // 3. Filter by 'chicken' (both are included)
    const resChicken = filterProducts([p1, p2, p3], { species: 'chicken' });
    expect(resChicken.items.map((i) => i.slug)).toEqual(['p1', 'p2']);
  });

  it('filters by aquatic group', () => {
    const p1 = createDummyProduct({
      slug: 'p1',
      speciesIndications: [{ species: 'eel-order', label: '鰻形目', restrictions: [], generic: false, indication: '赤鰭' }],
    });
    const p2 = createDummyProduct({
      slug: 'p2',
      speciesIndications: [{ species: 'pig', label: '豬', restrictions: [], generic: false, indication: '赤鰭' }],
    });

    const res = filterProducts([p1, p2], { species: 'aquatic' });
    expect(res.items.map((i) => i.slug)).toEqual(['p1']);
  });
});
