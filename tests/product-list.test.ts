/**
 * 任務 2.3：product-list.ts 新增能力的測試——角色篩選、類別預設、
 * 隱藏數量、卡片 HTML 跳脫。
 */
import { describe, it, expect } from 'vitest';
import {
  filterProducts,
  renderProductCard,
  type ListedProduct,
} from '../src/lib/product-list';

function makeProduct(overrides: Partial<ListedProduct> = {}): ListedProduct {
  return {
    slug: 'm-test',
    licenseNo: '動物藥製字第00001號',
    nameZh: '測試產品',
    nameEn: 'TEST PRODUCT',
    origin: '國產',
    category: 'general',
    status: 'active',
    expiryDate: '2030-01-01',
    dosageFormCategory: '注射劑',
    isSingleIngredient: true,
    ingredients: [{ name: 'TYLOSIN', slug: 'tylosin' }],
    speciesIndications: [{ species: 'pig', restrictions: [] }],
    vendorName: '大豐化學製藥股份有限公司',
    factoryName: '大豐化學製藥股份有限公司',
    ...overrides,
  };
}

describe('角色篩選 (task 2.3)', () => {
  const both = makeProduct({ slug: 'both', roles: ['vendor', 'factory'] });
  const vendorOnly = makeProduct({
    slug: 'v-only',
    vendorName: '甲公司',
    factoryName: '乙公司',
    roles: ['vendor'],
  });
  const factoryOnly = makeProduct({
    slug: 'f-only',
    vendorName: '丙公司',
    factoryName: '甲公司',
    roles: ['factory'],
  });
  const all = [both, vendorOnly, factoryOnly];

  it('同時擔任兩種角色的產品在兩種篩選下都出現', () => {
    expect(filterProducts(all, { role: 'vendor' }).items.map((p) => p.slug)).toEqual([
      'both',
      'v-only',
    ]);
    expect(filterProducts(all, { role: 'factory' }).items.map((p) => p.slug)).toEqual([
      'both',
      'f-only',
    ]);
  });

  it('同一產品只列一次', () => {
    const res = filterProducts(all, { role: 'all' });
    expect(res.items.map((p) => p.slug)).toEqual(['both', 'v-only', 'f-only']);
  });

  it('只擔任製造廠的產品在申請業者篩選下不顯示', () => {
    const res = filterProducts([factoryOnly], { role: 'vendor' });
    expect(res.items).toEqual([]);
  });
});

describe('類別預設與隱藏數量 (task 2.3)', () => {
  const general = makeProduct({ slug: 'g', category: 'general', status: 'active' });
  const biologic = makeProduct({ slug: 'b', category: 'biologic', status: 'active' });
  const rawMat = makeProduct({ slug: 'r', category: 'raw-material', status: 'active' });
  const expiredGeneral = makeProduct({ slug: 'e', category: 'general', status: 'expired' });
  const all = [general, biologic, rawMat, expiredGeneral];

  it('預設只含一般藥品', () => {
    const res = filterProducts(all, {});
    expect(res.items.map((p) => p.slug)).toEqual(['g']);
  });

  it('隱藏數量正確', () => {
    const res = filterProducts(all, {});
    expect(res.hiddenBiologicCount).toBe(1);
    expect(res.hiddenRawMaterialCount).toBe(1);
    expect(res.hiddenExpiredCount).toBe(1);
  });

  it('勾選包含生物製劑後列出', () => {
    const res = filterProducts(all, { includeBiologic: true });
    expect(res.items.map((p) => p.slug)).toEqual(['g', 'b']);
    expect(res.hiddenBiologicCount).toBe(0);
  });

  it('勾選包含原料藥後列出', () => {
    const res = filterProducts(all, { includeRawMaterial: true });
    expect(res.items.map((p) => p.slug)).toEqual(['g', 'r']);
  });

  it('隱藏數量等於單獨勾選該項後會多出的產品數（已失效的生物製劑不計入）', () => {
    const expiredBiologic = makeProduct({ slug: 'eb', category: 'biologic', status: 'expired' });
    const products = [biologic, expiredBiologic];
    const res = filterProducts(products, {});
    expect(res.hiddenBiologicCount).toBe(1);
    expect(res.hiddenExpiredCount).toBe(0);

    const shown = filterProducts(products, { includeBiologic: true });
    expect(shown.items.length).toBe(res.hiddenBiologicCount);
  });

  it('隱藏數量套用目前的其他篩選條件', () => {
    const pigBiologic = makeProduct({
      slug: 'pb',
      category: 'biologic',
      status: 'active',
      speciesIndications: [{ species: 'pig', restrictions: [] }],
    });
    const chickenBiologic = makeProduct({
      slug: 'cb',
      category: 'biologic',
      status: 'active',
      speciesIndications: [{ species: 'chicken', restrictions: [] }],
    });
    const res = filterProducts([pigBiologic, chickenBiologic], { species: 'pig' });
    expect(res.hiddenBiologicCount).toBe(1);
  });
});

describe('卡片 HTML 跳脫與連結 (task 2.3)', () => {
  it('品名含 <script> 時以純文字輸出', () => {
    const p = makeProduct({ nameZh: '<script>alert("xss")</script>阿莫西林"藥劑"' });
    const html = renderProductCard(p, {
      mode: 'ingredient',
      currentIngredientSlug: 'tylosin',
      isCompared: false,
    });
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&quot;藥劑&quot;');
  });

  it('公司名稱含特殊字元時連結經編碼、文字經跳脫', () => {
    const p = makeProduct({ vendorName: 'A & B "公司"', factoryName: '' });
    const html = renderProductCard(p, {
      mode: 'company',
      companyName: 'A & B "公司"',
      isCompared: false,
    });
    expect(html).toContain(
      `/Search-VeterinaryDrug/company/?name=${encodeURIComponent('A & B "公司"')}`
    );
    expect(html).toContain('A &amp; B &quot;公司&quot;');
    // 空白製造廠顯示未載明且不是連結
    expect(html).toContain('製造廠：未載明');
  });

  it('公司模式顯示角色標記', () => {
    const both = makeProduct({ roles: ['vendor', 'factory'] });
    const html = renderProductCard(both, {
      mode: 'company',
      companyName: '大豐化學製藥股份有限公司',
      isCompared: true,
    });
    expect(html).toContain('申請業者・製造廠');
    expect(html).toContain('checked');

    const vendorOnly = makeProduct({
      vendorName: '甲公司',
      factoryName: '乙公司',
      roles: ['vendor'],
    });
    const htmlV = renderProductCard(vendorOnly, {
      mode: 'company',
      companyName: '甲公司',
      isCompared: false,
    });
    expect(htmlV).toContain('申請業者');
    expect(htmlV).not.toContain('申請業者・製造廠');
  });

  it('成分模式的複方顯示其他成分連結，公司模式顯示全部成分連結', () => {
    const p = makeProduct({
      isSingleIngredient: false,
      ingredients: [
        { name: 'TYLOSIN', slug: 'tylosin' },
        { name: 'SULFA', slug: 'sulfa', chineseName: '磺胺' },
      ],
    });
    const ingHtml = renderProductCard(p, {
      mode: 'ingredient',
      currentIngredientSlug: 'tylosin',
      isCompared: false,
    });
    expect(ingHtml).toContain('複方包含');
    expect(ingHtml).not.toContain('TYLOSIN');
    expect(ingHtml).toContain('/Search-VeterinaryDrug/ingredient/?slug=sulfa');

    const coHtml = renderProductCard(p, {
      mode: 'company',
      companyName: '甲公司',
      isCompared: false,
    });
    expect(coHtml).toContain('/Search-VeterinaryDrug/ingredient/?slug=tylosin');
    expect(coHtml).toContain('磺胺');
  });
});
