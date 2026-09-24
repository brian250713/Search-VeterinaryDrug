import { describe, it, expect } from 'vitest';
import { renderProduct } from '../src/lib/render-product';
import type { Product } from '../src/types/drug';

function createBaseProduct(overrides: Partial<Product> = {}): Product {
  return {
    slug: 'test-slug',
    licenseNo: '農安字第00000號',
    origin: '國產',
    category: 'general',
    exportOnly: false,
    nameZh: '測試產品',
    nameEn: 'Test Product',
    vendorName: '測試藥廠',
    vendorAddress: '台北市測試路1號',
    factoryName: '測試製造廠',
    factoryAddress: '新北市製造路2號',
    dosageForm: {
      raw: '注射劑',
      category: '注射劑',
    },
    package: '100ml/瓶',
    status: 'active',
    issueDate: '2020-01-01',
    expiryDate: '2028-12-31',
    isSingleIngredient: true,
    ingredients: [
      {
        name: 'AMOXICILLIN',
        chineseName: '阿莫西林',
        originalText: 'AMOXICILLIN 100MG',
        verified: true,
        slug: 'amoxicillin',
      },
    ],
    ingredientsText: 'AMOXICILLIN 100MG',
    speciesIndications: [
      {
        species: 'chicken',
        label: '雞',
        restrictions: ['not-laying-hens'],
        generic: false,
        indication: '治療呼吸道感染',
      },
    ],
    indicationText: '治療呼吸道感染',
    ...overrides,
  };
}

describe('renderProduct (task 4.6 & product-detail spec)', () => {
  it('displays warning banner for expired products', () => {
    const activeProd = createBaseProduct({ status: 'active' });
    const expiredProd = createBaseProduct({ status: 'expired' });

    const activeHtml = renderProduct(activeProd);
    expect(activeHtml).not.toContain('此動物用藥品許可證已失效');

    const expiredHtml = renderProduct(expiredProd);
    expect(expiredHtml).toContain('此動物用藥品許可證已失效');
    expect(expiredHtml).toContain('badge-expired');
  });

  it('displays "未載明" for empty fields', () => {
    const prod = createBaseProduct({
      vendorAddress: '',
      factoryAddress: '   ',
      package: '',
      issueDate: null,
      expiryDate: null,
      status: 'unknown',
    });

    const html = renderProduct(prod);
    expect(html).toContain('未載明');
  });

  it('displays laying hens restrictions with warning style', () => {
    const prod = createBaseProduct({
      speciesIndications: [
        {
          species: 'chicken',
          label: '雞',
          restrictions: ['not-laying-hens'],
          generic: false,
          indication: '治療呼吸道感染',
        },
      ],
    });

    const html = renderProduct(prod);
    expect(html).toContain('badge-warn');
    expect(html).toContain('不含產蛋中之蛋雞');
  });

  it('outputs product name with <script> as plain text (escapes HTML)', () => {
    const prod = createBaseProduct({
      nameZh: '<script>alert("xss")</script>阿莫西林"藥劑"',
    });

    const html = renderProduct(prod);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&quot;藥劑&quot;');
  });
});
