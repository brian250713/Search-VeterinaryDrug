import type {
  ProductCategory,
  ProductStatus,
  DosageFormInfo,
} from '../types/drug.js';

export function parseLicenseNo(raw: string | undefined | null): {
  slug: string;
  origin: '國產' | '輸入';
  licenseNo: string;
} | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Pattern: e.g. "動物藥製字第09469號", "動物藥入字第07606號", "製字第F0106號"
  const match = trimmed.match(/(?:動物藥)?(製|入)字第([A-Za-z0-9]+)號?/);
  if (!match) return null;

  const typeChar = match[1];
  const numberPart = match[2].toLowerCase();

  const prefix = typeChar === '製' ? 'm' : 'i';
  const origin = typeChar === '製' ? '國產' : '輸入';
  const slug = `${prefix}-${numberPart}`;

  return {
    slug,
    origin,
    licenseNo: trimmed,
  };
}

export function cleanHtml(text: string | undefined | null): string {
  if (!text) return '';

  let res = text;

  // Replace line-break tags with newlines
  res = res.replace(/<br\s*\/?>/gi, '\n');
  res = res.replace(/<\/?(?:div|p|tr|li|h[1-6])\b[^>]*>/gi, '\n');

  // Strip all other tags, keeping their inner content (e.g. <sub>2</sub> -> 2)
  res = res.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  res = res
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");

  // Decode numeric entities &#123; and &#x7B;
  res = res.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  res = res.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Normalize newlines and whitespace
  res = res
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return res;
}

export function parseRocDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Format 1: 中華民國1100913 or 1100913 (3 digits year + 2 month + 2 day)
  const compactMatch = trimmed.match(/(?:中華民國)?(\d{2,3})(\d{2})(\d{2})/);
  if (compactMatch && trimmed.includes('中華民國') && !trimmed.includes('年')) {
    const year = Number(compactMatch[1]) + 1911;
    const month = compactMatch[2];
    const day = compactMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format 2: 中華民國110年09月13日, 至120年08月31日止, 110年9月13日
  const standardMatch = trimmed.match(/(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (standardMatch) {
    const year = Number(standardMatch[1]) + 1911;
    const month = standardMatch[2].padStart(2, '0');
    const day = standardMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function determineStatus(
  validityStr: string | undefined | null,
  referenceDate: string = '2026-09-23'
): { status: ProductStatus; expiryDate: string | null } {
  if (!validityStr) {
    return { status: 'unknown', expiryDate: null };
  }

  const trimmed = validityStr.trim();
  const isMarkedExpired = trimmed.includes('(已失效)') || trimmed.includes('已失效');
  const expiryDate = parseRocDate(trimmed);

  if (isMarkedExpired) {
    return { status: 'expired', expiryDate };
  }

  if (expiryDate) {
    if (expiryDate < referenceDate) {
      return { status: 'expired', expiryDate };
    }
    return { status: 'active', expiryDate };
  }

  return { status: 'unknown', expiryDate: null };
}

export function determineCategory(dosageFormRaw: string | undefined | null): ProductCategory {
  if (!dosageFormRaw) return 'general';
  if (dosageFormRaw.includes('生物製劑')) return 'biologic';
  if (dosageFormRaw.includes('原料藥')) return 'raw-material';
  return 'general';
}

export function parseDosageForm(
  raw: string | undefined | null,
  dosageMap: Record<string, string> = {}
): DosageFormInfo {
  const formRaw = (raw || '').trim();
  if (!formRaw) {
    return { raw: '', category: '未載明' };
  }

  // Check pattern: "大類(子類)" or "大類（子類）"
  const bracketMatch = formRaw.match(/^([^(（]+)[(（]([^)）]+)[)）]$/);
  if (bracketMatch) {
    const mainCategory = bracketMatch[1].trim();
    const subCategory = bracketMatch[2].trim();
    return {
      raw: formRaw,
      category: mainCategory,
      subcategory: subCategory,
    };
  }

  // Check map lookup
  if (dosageMap[formRaw]) {
    return {
      raw: formRaw,
      category: dosageMap[formRaw],
    };
  }

  return {
    raw: formRaw,
    category: formRaw,
  };
}

export function parseExportOnly(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  return trimmed === '是';
}
