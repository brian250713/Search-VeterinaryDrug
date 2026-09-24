import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import { cjkBigramTokenizer } from '../src/lib/search-tokenizer.js';

describe('Search Tokenizer (specs/drug-search)', () => {
  it('generates unigrams and bigrams for CJK words', () => {
    const tokens = cjkBigramTokenizer('阿莫西林');
    expect(tokens).toContain('阿');
    expect(tokens).toContain('莫');
    expect(tokens).toContain('西');
    expect(tokens).toContain('林');
    expect(tokens).toContain('阿莫');
    expect(tokens).toContain('莫西');
    expect(tokens).toContain('西林');
  });

  it('matches partial Chinese query "阿莫" with MiniSearch', () => {
    const miniSearch = new MiniSearch({
      fields: ['title'],
      tokenize: cjkBigramTokenizer,
    });

    miniSearch.addAll([
      { id: 1, title: '聯邦阿莫西林散' },
      { id: 2, title: '泰樂黴素注射液' },
      { id: 3, title: '福樂健口服液' },
    ]);

    const results = miniSearch.search('阿莫', { combineWith: 'AND' });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(1);
  });

  it('is case-insensitive for English ingredients and numbers', () => {
    const miniSearch = new MiniSearch({
      fields: ['ingredient', 'licenseNo'],
      tokenize: cjkBigramTokenizer,
    });

    miniSearch.addAll([
      { id: 1, ingredient: 'FLORFENICOL', licenseNo: '動物藥製字第09469號' },
      { id: 2, ingredient: 'TYLOSIN', licenseNo: '動物藥入字第07355號' },
    ]);

    const res1 = miniSearch.search('florfenicol');
    expect(res1.length).toBe(1);
    expect(res1[0].id).toBe(1);

    const res2 = miniSearch.search('09469');
    expect(res2.length).toBe(1);
    expect(res2[0].id).toBe(1);
  });
});
