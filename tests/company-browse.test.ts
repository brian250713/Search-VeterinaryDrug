import { describe, it, expect } from 'vitest';
import {
  matchCompany,
  compareCompanies,
  type CompanyFilterOptions,
} from '../src/lib/company';
import type { CompanySummary } from '../src/types/drug';

function makeSummary(overrides: Partial<CompanySummary>): CompanySummary {
  return {
    name: '測試公司',
    productCount: 10,
    activeCount: 5,
    vendorCount: 6,
    factoryCount: 4,
    ...overrides,
  };
}

const baseOptions: CompanyFilterOptions = {
  query: '',
  role: 'all',
  includeInactive: false,
};

describe('matchCompany', () => {
  it('預設排除 activeCount 為 0 的公司', () => {
    expect(
      matchCompany(makeSummary({ activeCount: 0 }), baseOptions)
    ).toBe(false);
    expect(matchCompany(makeSummary({ activeCount: 1 }), baseOptions)).toBe(
      true
    );
  });

  it('includeInactive 勾選後包含無有效許可證的公司', () => {
    expect(
      matchCompany(makeSummary({ activeCount: 0 }), {
        ...baseOptions,
        includeInactive: true,
      })
    ).toBe(true);
  });

  it('名稱部分比對', () => {
    expect(
      matchCompany(makeSummary({ name: '大豐化學製藥股份有限公司' }), {
        ...baseOptions,
        includeInactive: true,
        query: '大豐',
      })
    ).toBe(true);
    expect(
      matchCompany(makeSummary({ name: '大安化學製藥股份有限公司第一廠' }), {
        ...baseOptions,
        includeInactive: true,
        query: '大豐',
      })
    ).toBe(false);
  });

  it('英文不分大小寫', () => {
    expect(
      matchCompany(makeSummary({ name: 'SWISS PHARMACEUTICAL CO., LTD.' }), {
        ...baseOptions,
        includeInactive: true,
        query: 'swiss pharmaceutical',
      })
    ).toBe(true);
  });

  it('查詢含多餘空白仍可比對', () => {
    expect(
      matchCompany(makeSummary({ name: '大豐化學製藥股份有限公司' }), {
        ...baseOptions,
        includeInactive: true,
        query: '  大豐  ',
      })
    ).toBe(true);
  });

  it('角色篩選：申請業者', () => {
    expect(
      matchCompany(makeSummary({ vendorCount: 5, factoryCount: 0 }), {
        ...baseOptions,
        includeInactive: true,
        role: 'vendor',
      })
    ).toBe(true);
    expect(
      matchCompany(makeSummary({ vendorCount: 0, factoryCount: 5 }), {
        ...baseOptions,
        includeInactive: true,
        role: 'vendor',
      })
    ).toBe(false);
  });

  it('角色篩選：製造廠', () => {
    expect(
      matchCompany(makeSummary({ vendorCount: 0, factoryCount: 5 }), {
        ...baseOptions,
        includeInactive: true,
        role: 'factory',
      })
    ).toBe(true);
    expect(
      matchCompany(makeSummary({ vendorCount: 5, factoryCount: 0 }), {
        ...baseOptions,
        includeInactive: true,
        role: 'factory',
      })
    ).toBe(false);
  });

  it('角色篩選與包含無效公司一併套用', () => {
    expect(
      matchCompany(makeSummary({ activeCount: 0, vendorCount: 3, factoryCount: 0 }), {
        ...baseOptions,
        role: 'factory',
        includeInactive: true,
      })
    ).toBe(false);
    expect(
      matchCompany(makeSummary({ activeCount: 0, vendorCount: 0, factoryCount: 3 }), {
        ...baseOptions,
        role: 'factory',
        includeInactive: true,
      })
    ).toBe(true);
  });
});

describe('compareCompanies', () => {
  it('產品數由多到少（預設）', () => {
    const a = makeSummary({ name: '甲公司', productCount: 100 });
    const b = makeSummary({ name: '乙公司', productCount: 50 });
    expect(compareCompanies(a, b, 'product')).toBeLessThan(0);
    expect(compareCompanies(b, a, 'product')).toBeGreaterThan(0);
  });

  it('未失效許可證數由多到少', () => {
    const a = makeSummary({ name: '甲公司', activeCount: 30 });
    const b = makeSummary({ name: '乙公司', activeCount: 10 });
    expect(compareCompanies(a, b, 'active')).toBeLessThan(0);
    expect(compareCompanies(b, a, 'active')).toBeGreaterThan(0);
  });

  it('名稱排序使用 zh-Hant', () => {
    const a = makeSummary({ name: '大安公司' });
    const b = makeSummary({ name: '大豐公司' });
    expect(compareCompanies(a, b, 'name')).toBe(
      '大安公司'.localeCompare('大豐公司', 'zh-Hant')
    );
  });

  it('同分時以名稱排序（順序穩定）', () => {
    const a = makeSummary({ name: '大豐公司', productCount: 10, activeCount: 5 });
    const b = makeSummary({ name: '大安公司', productCount: 10, activeCount: 5 });
    expect(compareCompanies(a, b, 'product')).toBe(
      '大豐公司'.localeCompare('大安公司', 'zh-Hant')
    );
    expect(compareCompanies(a, b, 'active')).toBe(
      '大豐公司'.localeCompare('大安公司', 'zh-Hant')
    );
  });
});
