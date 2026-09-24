import { describe, it, expect } from 'vitest';
import { SpeciesNormalizer } from '../src/lib/normalizer-species.js';
import speciesMapData from '../data/species-map.json';

describe('Species & Restriction Normalization (specs/data-normalization)', () => {
  const normalizer = new SpeciesNormalizer(speciesMapData);

  it('handles multi-segment, multi-species with restrictions', () => {
    const raw = '豬：治療放線桿菌胸膜肺炎。雞（不含產蛋中之蛋雞）：治療大腸桿菌症。';
    const res = normalizer.extractSpeciesIndications(raw);

    expect(res.indications.length).toBe(2);

    const pig = res.indications.find((i) => i.species === 'pig');
    expect(pig).toBeDefined();
    expect(pig?.restrictions).toEqual([]);
    expect(pig?.indication).toContain('治療放線桿菌胸膜肺炎');

    const chicken = res.indications.find((i) => i.species === 'chicken');
    expect(chicken).toBeDefined();
    expect(chicken?.restrictions).toEqual(['not-laying-hens']);
    expect(chicken?.indication).toContain('治療大腸桿菌症');
  });

  it('expands multiple species in a single segment', () => {
    const raw = '牛、馬、豬：治療細菌性感染症。';
    const res = normalizer.extractSpeciesIndications(raw);

    const species = res.indications.map((i) => i.species);
    expect(species).toContain('cattle');
    expect(species).toContain('horse');
    expect(species).toContain('pig');
    expect(res.indications.length).toBe(3);

    res.indications.forEach((ind) => {
      expect(ind.indication).toBe('治療細菌性感染症。');
    });
  });

  it('handles general egg-laying poultry restrictions for chicken and duck', () => {
    const raw = '雞、鴨（不含產蛋中之蛋禽）：治療感染症。';
    const res = normalizer.extractSpeciesIndications(raw);

    const chicken = res.indications.find((i) => i.species === 'chicken');
    const duck = res.indications.find((i) => i.species === 'duck');

    expect(chicken?.restrictions).toContain('not-laying-hens');
    expect(duck?.restrictions).toContain('not-laying-ducks');
  });

  it('expands generic categories with generic: true', () => {
    const raw = '家禽：預防沙門氏菌症。';
    const res = normalizer.extractSpeciesIndications(raw);

    const species = res.indications.map((i) => i.species);
    expect(species).toContain('chicken');
    expect(species).toContain('duck');
    expect(species).toContain('goose');
    expect(species).toContain('turkey');

    res.indications.forEach((i) => {
      expect(i.generic).toBe(true);
    });
  });

  it('preserves aquatic species orders', () => {
    const raw = '鰻形目：治療赤鰭病。';
    const res = normalizer.extractSpeciesIndications(raw);

    expect(res.indications.length).toBe(1);
    expect(res.indications[0].species).toBe('eel-order');
    expect(res.indications[0].indication).toBe('治療赤鰭病。');
  });

  it('falls back to keyword scanning when no colon exists', () => {
    const raw = '本藥品專門用於犬之嚴重皮膚感染症治療。';
    const res = normalizer.extractSpeciesIndications(raw);

    expect(res.hasColonStructure).toBe(false);
    expect(res.indications.some((i) => i.species === 'dog')).toBe(true);
    expect(res.indications[0].indication).toBe(raw);
  });

  it('regression tests on 20 actual sample patterns with restrictions', () => {
    const sampleHeaders = [
      '雞（不含產蛋中之蛋雞）',
      '雞(不含產蛋中之蛋雞)',
      '雞、火雞（不含產蛋中之蛋雞）',
      '雞（不含蛋雞）',
      '豬、雞（不含產蛋中之蛋雞）',
      '雞、火雞（不含蛋雞）',
      '雞(不含蛋雞)',
      '土番鴨（不含產蛋中之蛋鴨）',
      '雞、火雞(不含產蛋中之蛋雞)',
      '肉雞、肉鴨（不含產蛋中之蛋禽）',
      '雞(產蛋中之蛋雞除外)',
      '鴨（不含蛋鴨）',
      '肉雞(產蛋雞禁用)',
      '雞（產蛋期禁用）',
      '土雞（不含產蛋中蛋雞）',
      '鴨（產蛋中之蛋鴨除外）',
      '火雞、肉雞（不含產蛋中之蛋雞）',
      '雞（產蛋中禁用）',
      '蛋鴨除外之鴨',
      '雞(產蛋雞除外)',
    ];

    for (const h of sampleHeaders) {
      const text = `${h}：治療疾病。`;
      const res = normalizer.extractSpeciesIndications(text);
      expect(res.indications.length).toBeGreaterThan(0);
      const hasAnyRestriction = res.indications.some(
        (i) => i.restrictions.length > 0
      );
      expect(
        hasAnyRestriction,
        `Expected restriction in header: "${h}"`
      ).toBe(true);
    }
  });
});
