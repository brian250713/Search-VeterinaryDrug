import { describe, it, expect } from 'vitest';
import { normalizeCompanyName } from '../src/lib/company';
import { companyUrl } from '../src/lib/url';
import { shardOf, COMPANY_SHARDS } from '../src/lib/shard';

describe('normalizeCompanyName (task 1.1)', () => {
  it('合併連續空白為一個半形空白', () => {
    expect(normalizeCompanyName('SWISS PHARMACEUTICAL CO.,  LTD.')).toBe(
      'SWISS PHARMACEUTICAL CO., LTD.'
    );
  });

  it('去除前後空白', () => {
    expect(normalizeCompanyName('  大豐化學製藥股份有限公司  ')).toBe(
      '大豐化學製藥股份有限公司'
    );
  });

  it('全形空白視為空白並合併', () => {
    expect(normalizeCompanyName('大豐　化學製藥　股份有限公司')).toBe(
      '大豐 化學製藥 股份有限公司'
    );
  });

  it('中文名稱不變', () => {
    expect(normalizeCompanyName('大豐化學製藥股份有限公司')).toBe(
      '大豐化學製藥股份有限公司'
    );
  });

  it('空字串回傳空字串', () => {
    expect(normalizeCompanyName('')).toBe('');
    expect(normalizeCompanyName('   ')).toBe('');
    expect(normalizeCompanyName(null)).toBe('');
    expect(normalizeCompanyName(undefined)).toBe('');
  });

  it('不改大小寫與標點', () => {
    expect(normalizeCompanyName('ABC Co., Ltd. (TEST)')).toBe('ABC Co., Ltd. (TEST)');
  });
});

describe('companyUrl (task 1.2)', () => {
  it('中文名稱產生正確網址', () => {
    expect(companyUrl('大豐化學製藥股份有限公司')).toBe(
      `/Search-VeterinaryDrug/company/?name=${encodeURIComponent('大豐化學製藥股份有限公司')}`
    );
  });

  it('含 & 與空白的名稱正確編碼', () => {
    expect(companyUrl('A & B  Co.')).toBe(
      '/Search-VeterinaryDrug/company/?name=A%20%26%20B%20Co.'
    );
  });

  it('多餘空白先正規化再編碼', () => {
    expect(companyUrl('SWISS PHARMACEUTICAL CO.,  LTD.')).toBe(
      `/Search-VeterinaryDrug/company/?name=${encodeURIComponent('SWISS PHARMACEUTICAL CO., LTD.')}`
    );
  });
});

describe('COMPANY_SHARDS (task 1.3)', () => {
  it('固定為 64 片', () => {
    expect(COMPANY_SHARDS).toBe(64);
  });

  it('固定 3 個中英文公司名稱的分片編號，防止雜湊漂移', () => {
    expect(shardOf('大豐化學製藥股份有限公司', COMPANY_SHARDS)).toBe(17);
    expect(shardOf('大安化學製藥股份有限公司第一廠', COMPANY_SHARDS)).toBe(6);
    expect(shardOf('SWISS PHARMACEUTICAL CO., LTD.', COMPANY_SHARDS)).toBe(43);
  });
});
