import { describe, it, expect } from 'vitest';
import {
  parseLicenseNo,
  cleanHtml,
  parseRocDate,
  determineStatus,
  determineCategory,
  parseDosageForm,
  parseExportOnly,
} from '../src/lib/normalizer-basic.js';

describe('Basic Normalization (specs/data-normalization)', () => {
  describe('parseLicenseNo', () => {
    it('parses domestic drug license number', () => {
      const parsed = parseLicenseNo('動物藥製字第09469號');
      expect(parsed).toEqual({
        slug: 'm-09469',
        origin: '國產',
        licenseNo: '動物藥製字第09469號',
      });
    });

    it('parses domestic drug license number with letters', () => {
      const parsed = parseLicenseNo('動物藥製字第F0106號');
      expect(parsed).toEqual({
        slug: 'm-f0106',
        origin: '國產',
        licenseNo: '動物藥製字第F0106號',
      });
    });

    it('parses imported drug license number', () => {
      const parsed = parseLicenseNo('動物藥入字第07606號');
      expect(parsed).toEqual({
        slug: 'i-07606',
        origin: '輸入',
        licenseNo: '動物藥入字第07606號',
      });
    });

    it('returns null for empty license number', () => {
      expect(parseLicenseNo('')).toBeNull();
      expect(parseLicenseNo('   ')).toBeNull();
      expect(parseLicenseNo(null)).toBeNull();
    });
  });

  describe('cleanHtml', () => {
    it('removes tags and converts line break tags to newlines', () => {
      const raw = '<div>EACH ML CONTAINS：<br>FLORFENICOL 200 MG</div>';
      const cleaned = cleanHtml(raw);
      expect(cleaned).not.toContain('<');
      expect(cleaned).not.toContain('&nbsp;');
      expect(cleaned).toContain('EACH ML CONTAINS：\nFLORFENICOL 200 MG');
    });

    it('keeps inner text for inline tags like sub and sup', () => {
      const raw = 'H<sub>2</sub>O and &amp; &lt;span&gt;';
      const cleaned = cleanHtml(raw);
      expect(cleaned).toBe('H2O and & <span>');
    });
  });

  describe('parseRocDate', () => {
    it('parses standard ROC date format', () => {
      expect(parseRocDate('中華民國110年09月13日')).toBe('2021-09-13');
    });

    it('parses compact ROC date format', () => {
      expect(parseRocDate('中華民國1100913')).toBe('2021-09-13');
    });

    it('parses validity format "至...止"', () => {
      expect(parseRocDate('至120年08月31日止')).toBe('2031-08-31');
    });

    it('returns null for unparseable dates', () => {
      expect(parseRocDate('')).toBeNull();
      expect(parseRocDate('永久')).toBeNull();
    });
  });

  describe('determineStatus', () => {
    const buildDate = '2026-09-23';

    it('marks expired if explicitly marked (已失效)', () => {
      const res = determineStatus('至99年12月31日止(已失效)', buildDate);
      expect(res.status).toBe('expired');
      expect(res.expiryDate).toBe('2010-12-31');
    });

    it('marks expired if date is before buildDate without explicit tag', () => {
      const res = determineStatus('至115年06月30日止', buildDate); // 2026-06-30 < 2026-09-23
      expect(res.status).toBe('expired');
      expect(res.expiryDate).toBe('2026-06-30');
    });

    it('marks active if date is after buildDate', () => {
      const res = determineStatus('至120年08月31日止', buildDate); // 2031-08-31
      expect(res.status).toBe('active');
      expect(res.expiryDate).toBe('2031-08-31');
    });

    it('marks unknown if date is missing or invalid without expired tag', () => {
      const res = determineStatus('', buildDate);
      expect(res.status).toBe('unknown');
      expect(res.expiryDate).toBeNull();
    });
  });

  describe('determineCategory & parseExportOnly', () => {
    it('identifies biologic category', () => {
      expect(determineCategory('生物製劑(液體)')).toBe('biologic');
    });

    it('identifies raw-material category', () => {
      expect(determineCategory('原料藥(散劑)')).toBe('raw-material');
    });

    it('identifies general category', () => {
      expect(determineCategory('注射劑(注射劑)')).toBe('general');
    });

    it('parses exportOnly', () => {
      expect(parseExportOnly('是')).toBe(true);
      expect(parseExportOnly('否')).toBe(false);
      expect(parseExportOnly('')).toBe(false);
    });
  });

  describe('parseDosageForm', () => {
    const dosageMap = { 注射液: '注射劑', 乾粉注射劑: '注射劑' };

    it('splits bracketed dosage form into category and subcategory', () => {
      const res = parseDosageForm('注射劑(乾粉注射劑)', dosageMap);
      expect(res).toEqual({
        raw: '注射劑(乾粉注射劑)',
        category: '注射劑',
        subcategory: '乾粉注射劑',
      });
    });

    it('maps unbracketed form via dosageMap', () => {
      const res = parseDosageForm('注射液', dosageMap);
      expect(res).toEqual({
        raw: '注射液',
        category: '注射劑',
      });
    });

    it('uses raw form when unmapped and unbracketed', () => {
      const res = parseDosageForm('特殊神秘劑型', dosageMap);
      expect(res).toEqual({
        raw: '特殊神秘劑型',
        category: '特殊神秘劑型',
      });
    });
  });
});
