import { describe, it, expect } from 'vitest';
import { normalizeFilterText, matchOverviewName } from '../src/lib/overview-filter';

describe('normalizeFilterText', () => {
  it('中文名稱正規化後不變', () => {
    expect(normalizeFilterText('大豐化學製藥股份有限公司')).toBe(
      '大豐化學製藥股份有限公司'
    );
  });

  it('英文轉小寫', () => {
    expect(normalizeFilterText('SWISS PHARMACEUTICAL CO., LTD.')).toBe(
      'swiss pharmaceutical co., ltd.'
    );
  });

  it('前後與連續空白合併', () => {
    expect(normalizeFilterText('  swiss   pharmaceutical  ')).toBe(
      'swiss pharmaceutical'
    );
  });

  it('全形空白視為空白', () => {
    expect(normalizeFilterText('大豐　化學')).toBe('大豐 化學');
  });

  it('空值回傳空字串', () => {
    expect(normalizeFilterText('')).toBe('');
    expect(normalizeFilterText('   ')).toBe('');
    expect(normalizeFilterText(null)).toBe('');
    expect(normalizeFilterText(undefined)).toBe('');
  });
});

describe('matchOverviewName', () => {
  it('中文部分比對', () => {
    expect(matchOverviewName('大豐化學製藥股份有限公司', '大豐')).toBe(true);
    expect(matchOverviewName('大安化學製藥股份有限公司第一廠', '大豐')).toBe(false);
  });

  it('英文不分大小寫', () => {
    expect(
      matchOverviewName('SWISS PHARMACEUTICAL CO., LTD.', 'swiss pharmaceutical')
    ).toBe(true);
    expect(
      matchOverviewName('SWISS PHARMACEUTICAL CO., LTD.', 'Swiss Pharmaceutical')
    ).toBe(true);
  });

  it('查詢含多餘空白仍可比對', () => {
    expect(
      matchOverviewName('SWISS PHARMACEUTICAL CO., LTD.', '  swiss   pharmaceutical  ')
    ).toBe(true);
    expect(matchOverviewName('大豐化學製藥股份有限公司', '  大豐  ')).toBe(true);
  });

  it('空查詢符合全部', () => {
    expect(matchOverviewName('大豐化學製藥股份有限公司', '')).toBe(true);
    expect(matchOverviewName('大豐化學製藥股份有限公司', '   ')).toBe(true);
    expect(matchOverviewName('大豐化學製藥股份有限公司', null)).toBe(true);
    expect(matchOverviewName('大豐化學製藥股份有限公司', undefined)).toBe(true);
  });

  it('成分中英文比對', () => {
    expect(matchOverviewName('AMOXICILLIN 阿莫西林', 'amoxicillin')).toBe(true);
    expect(matchOverviewName('AMOXICILLIN 阿莫西林', '阿莫西林')).toBe(true);
    expect(matchOverviewName('AMOXICILLIN 阿莫西林', 'AMOX')).toBe(true);
  });
});
