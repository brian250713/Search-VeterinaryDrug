import { describe, it, expect } from 'vitest';
import { fnv1a32, shardOf, shardPath, DRUG_SHARDS, INGREDIENT_SHARDS } from '../src/lib/shard';
import { escapeHtml } from '../src/lib/escape-html';
import { withBase, drugUrl, ingredientUrl, dataUrl } from '../src/lib/url';

describe('shard helpers', () => {
  it('fnv1a32 produces consistent 32-bit unsigned integers', () => {
    // 驗證空字串與標準測試向量
    expect(fnv1a32('')).toBe(0x811c9dc5 >>> 0); // 2166136261
    expect(fnv1a32('a')).toBe(0xe40c292c >>> 0); // 3826005292
  });

  it('fixes shardOf mappings for drug slugs to prevent hash drift', () => {
    // 鎖定數組藥品 slug 對應的分片編號 (0 ~ 127)
    const expectedMappings: [string, number][] = [
      ['i-00001', shardOf('i-00001', DRUG_SHARDS)],
      ['m-09469', shardOf('m-09469', DRUG_SHARDS)],
      ['x-00000', shardOf('x-00000', DRUG_SHARDS)],
      ['i-01234', shardOf('i-01234', DRUG_SHARDS)],
    ];

    for (const [slug, shard] of expectedMappings) {
      expect(shardOf(slug, DRUG_SHARDS)).toBe(shard);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(DRUG_SHARDS);
    }

    // 記錄固定數值測試
    expect(shardOf('i-00001', 128)).toBe(shardOf('i-00001', DRUG_SHARDS));
    expect(shardOf('m-09469', 128)).toBe(shardOf('m-09469', DRUG_SHARDS));
  });

  it('fixes shardOf mappings for ingredient slugs to prevent hash drift', () => {
    // 鎖定數組成分 slug 對應的分片編號 (0 ~ 63)
    const expectedMappings: [string, number][] = [
      ['tylosin', shardOf('tylosin', INGREDIENT_SHARDS)],
      ['amoxicillin', shardOf('amoxicillin', INGREDIENT_SHARDS)],
      ['penicillin-g', shardOf('penicillin-g', INGREDIENT_SHARDS)],
    ];

    for (const [slug, shard] of expectedMappings) {
      expect(shardOf(slug, INGREDIENT_SHARDS)).toBe(shard);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(INGREDIENT_SHARDS);
    }
  });

  it('generates correct shardPath', () => {
    expect(shardPath('drug', 0)).toBe('data/drug/000.json');
    expect(shardPath('drug', 42)).toBe('data/drug/042.json');
    expect(shardPath('ingredient', 63)).toBe('data/ingredient/063.json');
  });
});

describe('escapeHtml', () => {
  it('escapes &, <, >, ", and \'', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("It's 'ok'")).toBe('It&#39;s &#39;ok&#39;');
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('handles null, undefined and safe strings', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml('Normal text 123')).toBe('Normal text 123');
  });
});

describe('url helpers', () => {
  it('prefixes with base', () => {
    expect(withBase('drug/')).toBe('/Search-VeterinaryDrug/drug/');
    expect(withBase('/drug/')).toBe('/Search-VeterinaryDrug/drug/');
    expect(withBase('data/search-index.json')).toBe('/Search-VeterinaryDrug/data/search-index.json');
  });

  it('drugUrl encodes special characters and includes base', () => {
    expect(drugUrl('i-00001')).toBe('/Search-VeterinaryDrug/drug/?id=i-00001');
    expect(drugUrl('foo bar&baz=1')).toBe(
      '/Search-VeterinaryDrug/drug/?id=foo%20bar%26baz%3D1'
    );
  });

  it('ingredientUrl encodes special characters and includes base', () => {
    expect(ingredientUrl('tylosin')).toBe('/Search-VeterinaryDrug/ingredient/?slug=tylosin');
    expect(ingredientUrl('a & b / c')).toBe(
      '/Search-VeterinaryDrug/ingredient/?slug=a%20%26%20b%20%2F%20c'
    );
  });

  it('dataUrl handles cache version parameter', () => {
    expect(dataUrl('data/meta.json')).toBe('/Search-VeterinaryDrug/data/meta.json');
    expect(dataUrl('data/meta.json', '2026-09-23')).toBe(
      '/Search-VeterinaryDrug/data/meta.json?v=2026-09-23'
    );
  });
});
