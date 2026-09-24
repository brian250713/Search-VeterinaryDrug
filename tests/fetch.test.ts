import { describe, it, expect, vi } from 'vitest';
import {
  fetchAllRecords,
  fetchWithRetry,
  validateDataset,
  validateRecordFields,
  EXPECTED_FIELDS,
  FetchError,
} from '../src/lib/fetcher.js';

function createMockRecord(overrides: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {};
  for (const field of EXPECTED_FIELDS) {
    base[field] = '測試資料';
  }
  base['許可證字號'] = '動物藥製字第09469號';
  base['動物用藥品中文名稱'] = '安莫西林膠囊';
  return { ...base, ...overrides };
}

describe('Data Ingestion & Validation', () => {
  describe('validateRecordFields', () => {
    it('returns empty array when all 14 fields exist', () => {
      const rec = createMockRecord();
      expect(validateRecordFields(rec)).toEqual([]);
    });

    it('detects missing fields when renamed or absent', () => {
      const rec = createMockRecord();
      delete rec['成分'];
      rec['主成分'] = 'AMOXICILLIN';
      const missing = validateRecordFields(rec);
      expect(missing).toContain('成分');
    });
  });

  describe('validateDataset', () => {
    it('throws error when total records is exactly 9,999 (truncation)', () => {
      const records = Array.from({ length: 9999 }, () => createMockRecord());
      expect(() => validateDataset(records, 13739)).toThrowError(
        /exactly 9,999/
      );
    });

    it('throws error when records drop more than 5% compared to baseline', () => {
      const records = Array.from({ length: 12000 }, () => createMockRecord());
      expect(() => validateDataset(records, 13739)).toThrowError(
        /dropped by more than 5%/
      );
    });

    it('passes when records grow or drop less than 5%', () => {
      const records = Array.from({ length: 13750 }, () => createMockRecord());
      expect(() => validateDataset(records, 13739)).not.toThrow();
    });

    it('throws error when missing essential fields exceed 1%', () => {
      const records = Array.from({ length: 100 }, () => createMockRecord());
      // 2 out of 100 missing license number = 2% > 1%
      records[0]['許可證字號'] = '';
      records[1]['許可證字號'] = '  ';
      expect(() => validateDataset(records, 100)).toThrowError(
        /Essential fields missing rate/
      );
    });

    it('throws error when field schema is invalid', () => {
      const records = [createMockRecord(), createMockRecord()];
      delete records[1]['有效期間'];
      expect(() => validateDataset(records)).toThrowError(
        /missing expected fields: 有效期間/
      );
    });
  });

  describe('fetchWithRetry', () => {
    it('retries on failure and succeeds if subsequent attempt works', async () => {
      let callCount = 0;
      const mockFetch: any = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network timeout');
        }
        return {
          ok: true,
          json: async () => [{ item: 1 }],
        };
      });

      const res = await fetchWithRetry('https://api.test', 3, mockFetch);
      expect(callCount).toBe(2);
      expect(res).toEqual([{ item: 1 }]);
    });

    it('throws FetchError after exceeding max retries', async () => {
      const mockFetch: any = vi.fn(async () => {
        throw new Error('500 Internal Server Error');
      });

      await expect(
        fetchWithRetry('https://api.test', 2, mockFetch)
      ).rejects.toThrow(FetchError);
    });
  });

  describe('fetchAllRecords pagination', () => {
    it('fetches all pages until empty array and validates', async () => {
      const page1 = Array.from({ length: 50 }, () => createMockRecord());
      const page2 = Array.from({ length: 25 }, () => createMockRecord());

      let pageIndex = 0;
      const mockFetch: any = vi.fn(async (url: string) => {
        pageIndex++;
        if (pageIndex === 1) {
          return { ok: true, json: async () => page1 };
        } else if (pageIndex === 2) {
          return { ok: true, json: async () => page2 };
        } else {
          return { ok: true, json: async () => [] };
        }
      });

      const records = await fetchAllRecords({
        endpoint: 'https://api.test/data',
        pageSize: 50,
        baselineCount: 75,
        fetchFn: mockFetch,
      });

      expect(records.length).toBe(75);
      expect(mockFetch).toHaveBeenCalledTimes(2); // page2 was < pageSize (25 < 50), stops immediately
    });
  });
});
