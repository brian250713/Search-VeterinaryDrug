import { describe, it, expect } from 'vitest';
import { IngredientNormalizer } from '../src/lib/normalizer-ingredient.js';
import synonymsData from '../data/synonyms.json';

describe('Ingredient Normalization (specs/data-normalization)', () => {
  const normalizer = new IngredientNormalizer(synonymsData);

  it('merges AMOXICILLIN and AMOXYCILLIN spelling variants into AMOXICILLIN and marks as single ingredient', () => {
    const res1 = normalizer.extractIngredients('AMOXICILLIN TRIHYDRATE 100 MG');
    const res2 = normalizer.extractIngredients('AMOXYCILLIN TRIHYDRATE');

    expect(res1.ingredients.length).toBe(1);
    expect(res1.ingredients[0].name).toBe('AMOXICILLIN');
    expect(res1.ingredients[0].verified).toBe(true);
    expect(res1.isSingleIngredient).toBe(true);

    expect(res2.ingredients.length).toBe(1);
    expect(res2.ingredients[0].name).toBe('AMOXICILLIN');
    expect(res2.ingredients[0].verified).toBe(true);
    expect(res2.isSingleIngredient).toBe(true);
  });

  it('detects compound products like LINCOMYCIN + SPECTINOMYCIN', () => {
    const raw = 'LINCOMYCIN HCL 5GM<br/>SPECTINOMYCIN SULFATE 10GM';
    const res = normalizer.extractIngredients(raw);

    expect(res.ingredients.length).toBe(2);
    expect(res.ingredients.map((i) => i.name)).toEqual([
      'LINCOMYCIN',
      'SPECTINOMYCIN',
    ]);
    expect(res.isSingleIngredient).toBe(false);
  });

  it('handles HTML markup and entity decoding', () => {
    const raw = '<div>EACH ML CONTAINS：<br>&nbsp;&nbsp;FLORFENICOL 200 MG</div>';
    const res = normalizer.extractIngredients(raw);

    expect(res.ingredients.length).toBe(1);
    expect(res.ingredients[0].name).toBe('FLORFENICOL');
    expect(res.ingredients[0].chineseName).toBe('氟苯尼考');
    expect(res.isSingleIngredient).toBe(true);
    expect(res.cleanedText).not.toContain('&nbsp;');
    expect(res.cleanedText).not.toContain('<');
  });

  it('handles Chinese prefixes like 每瓶含有', () => {
    const raw = '每瓶含有：TYLOSIN TARTRATE 500MG';
    const res = normalizer.extractIngredients(raw);

    expect(res.ingredients.length).toBe(1);
    expect(res.ingredients[0].name).toBe('TYLOSIN');
    expect(res.ingredients[0].chineseName).toBe('泰樂黴素');
    expect(res.isSingleIngredient).toBe(true);
  });

  it('handles unverified ingredients not in synonyms.json', () => {
    const raw = 'SOMEUNKNOWNMEDICINE 50MG';
    const res = normalizer.extractIngredients(raw);

    expect(res.ingredients.length).toBe(1);
    expect(res.ingredients[0].name).toBe('SOMEUNKNOWNMEDICINE');
    expect(res.ingredients[0].verified).toBe(false);
    expect(res.ingredients[0].chineseName).toBeUndefined();
  });

  it('skips extraction for biologic products but preserves cleaned text', () => {
    const raw = '新城雞瘟活毒疫苗<br>每一劑量含有雞胚胎液 0.05ml';
    const res = normalizer.extractIngredients(raw, true);

    expect(res.ingredients).toEqual([]);
    expect(res.isSingleIngredient).toBe(false);
    expect(res.cleanedText).toContain('新城雞瘟活毒疫苗');
  });

  it('assigns slug to ProductIngredient and handles slug extraction', () => {
    const res = normalizer.extractIngredients('TYLOSIN TARTRATE 500MG');
    expect(res.ingredients[0].slug).toBe('tylosin');
  });
});

describe('Ingredient Aggregation by Slug (task 2.3 & design D4)', () => {
  it('merges TYLOSIN and TYLOSIN ，按乾燥品計算，每 into one ingredient, and counts product only once when both variants appear in same product', async () => {
    const { aggregateIngredients } = await import('../src/lib/normalizer-ingredient.js');
    const mockProducts: any[] = [
      {
        slug: 'prod-1',
        category: 'general',
        isSingleIngredient: false,
        ingredients: [
          {
            name: 'TYLOSIN',
            chineseName: '泰樂黴素',
            originalText: 'TYLOSIN',
            verified: true,
            slug: 'tylosin',
          },
          {
            name: 'TYLOSIN ，按乾燥品計算，每',
            chineseName: '',
            originalText: 'TYLOSIN ，按乾燥品計算，每',
            verified: false,
            slug: 'tylosin',
          },
        ],
      },
      {
        slug: 'prod-2',
        category: 'general',
        isSingleIngredient: true,
        ingredients: [
          {
            name: 'TYLOSIN',
            chineseName: '泰樂黴素',
            originalText: 'TYLOSIN',
            verified: true,
            slug: 'tylosin',
          },
        ],
      },
    ];

    const aggregated = aggregateIngredients(mockProducts);
    expect(aggregated.length).toBe(1);

    const tylosin = aggregated[0];
    expect(tylosin.slug).toBe('tylosin');
    // 標準名稱取產品數最多，同數取最短 -> 'TYLOSIN' 出現在 prod-1 與 prod-2 (產品數 2)，'TYLOSIN ，按乾燥品計算，每' 出現在 prod-1 (產品數 1)
    expect(tylosin.name).toBe('TYLOSIN');
    expect(tylosin.aliases).toContain('TYLOSIN ，按乾燥品計算，每');
    expect(tylosin.verified).toBe(true);
    // 同一產品含兩種寫法時只計算一次：prod-1 算 1 次，prod-2 算 1 次 -> productCount 應為 2
    expect(tylosin.productCount).toBe(2);
    expect(tylosin.singleProductCount).toBe(1);
    expect(tylosin.compoundProductCount).toBe(1);
  });

  it('ensures no duplicate slugs exist in ingredients.json if present', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const ingredientsPath = path.resolve(__dirname, '../data/ingredients.json');
    if (fs.existsSync(ingredientsPath)) {
      const ingredients = JSON.parse(fs.readFileSync(ingredientsPath, 'utf8'));
      const slugs = new Set<string>();
      const duplicates: string[] = [];
      for (const item of ingredients) {
        if (slugs.has(item.slug)) {
          duplicates.push(item.slug);
        }
        slugs.add(item.slug);
      }
      expect(duplicates).toEqual([]);
    }
  });
});

