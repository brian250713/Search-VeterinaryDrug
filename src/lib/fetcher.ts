import type { RawRecord } from '../types/drug.js';

export const MOA_API_ENDPOINT =
  'https://data.moa.gov.tw/Service/OpenData/FromM/ADProData.aspx?IsTransData=1&UnitId=023';

export const EXPECTED_FIELDS: (keyof RawRecord)[] = [
  '許可證字號',
  '動物用藥品中文名稱',
  '動物用藥品英文名稱',
  '業者名稱',
  '業者地址',
  '製造廠名稱',
  '製造廠地址',
  '劑型',
  '包裝',
  '效能(適應症)',
  '成分',
  '核發日期',
  '有效期間',
  '外銷專用',
];

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  fetchFn: typeof fetch = fetch
): Promise<any[]> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetchFn(url);
      if (!res.ok) {
        throw new FetchError(`HTTP error! status: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new FetchError('Response is not a JSON array');
      }
      return data;
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new FetchError(
    `Failed to fetch from ${url} after ${maxRetries} retries. Last error: ${lastError?.message || lastError}`
  );
}

export function validateRecordFields(record: any): string[] {
  const missing: string[] = [];
  for (const field of EXPECTED_FIELDS) {
    if (!(field in record)) {
      missing.push(field);
    }
  }
  return missing;
}

export function validateDataset(records: any[], baselineCount?: number): void {
  if (records.length === 9999) {
    throw new FetchError(
      'Validation failed: Total records is exactly 9,999, indicating silent pagination truncation.'
    );
  }

  if (baselineCount !== undefined && baselineCount > 0) {
    const minAllowed = baselineCount * 0.95;
    if (records.length < minAllowed) {
      throw new FetchError(
        `Validation failed: Total records (${records.length}) dropped by more than 5% compared to baseline (${baselineCount}).`
      );
    }
  }

  if (records.length === 0) {
    throw new FetchError('Validation failed: No records fetched.');
  }

  let missingEssentialCount = 0;
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const missing = validateRecordFields(rec);
    if (missing.length > 0) {
      throw new FetchError(
        `Validation failed: Record at index ${i} is missing expected fields: ${missing.join(', ')}`
      );
    }

    const licenseNo = rec['許可證字號'] ? String(rec['許可證字號']).trim() : '';
    const nameZh = rec['動物用藥品中文名稱'] ? String(rec['動物用藥品中文名稱']).trim() : '';
    if (!licenseNo || !nameZh) {
      missingEssentialCount++;
    }
  }

  const missingRate = missingEssentialCount / records.length;
  if (missingRate > 0.01) {
    throw new FetchError(
      `Validation failed: Essential fields missing rate (${(missingRate * 100).toFixed(2)}%) exceeds 1% limit.`
    );
  }
}

export interface FetchOptions {
  endpoint?: string;
  pageSize?: number;
  maxRetries?: number;
  baselineCount?: number;
  fetchFn?: typeof fetch;
  onProgress?: (fetchedCount: number, page: number) => void;
}

export async function fetchAllRecords(options: FetchOptions = {}): Promise<RawRecord[]> {
  const {
    endpoint = MOA_API_ENDPOINT,
    pageSize = 5000,
    maxRetries = 3,
    baselineCount,
    fetchFn = fetch,
    onProgress,
  } = options;

  let skip = 0;
  let page = 1;
  const allRecords: RawRecord[] = [];

  while (true) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const pageUrl = `${endpoint}${separator}$top=${pageSize}&$skip=${skip}`;

    const chunk = await fetchWithRetry(pageUrl, maxRetries, fetchFn);

    if (chunk.length === 0) {
      break;
    }

    allRecords.push(...chunk);
    if (onProgress) {
      onProgress(allRecords.length, page);
    }

    if (chunk.length < pageSize) {
      // Last page reached
      break;
    }

    skip += chunk.length;
    page++;
  }

  validateDataset(allRecords, baselineCount);
  return allRecords;
}
