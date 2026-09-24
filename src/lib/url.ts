const DEFAULT_BASE = '/Search-VeterinaryDrug';

import { normalizeCompanyName } from './company.js';

/**
 * 取得當前應用程式的 base path (不含結尾斜線)
 */
export function getBase(): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (
    metaEnv &&
    typeof metaEnv.BASE_URL === 'string' &&
    metaEnv.BASE_URL !== '/'
  ) {
    return metaEnv.BASE_URL.replace(/\/+$/, '');
  }
  return DEFAULT_BASE;
}

/**
 * 將相對路徑補上 base path
 * @example withBase('drug/') -> '/Search-VeterinaryDrug/drug/'
 * @example withBase('/data/meta.json') -> '/Search-VeterinaryDrug/data/meta.json'
 */
export function withBase(path: string): string {
  const base = getBase();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (!cleanPath) return base || '/';
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * 產品詳情頁連結
 * @example drugUrl('i-00001') -> '/Search-VeterinaryDrug/drug/?id=i-00001'
 */
export function drugUrl(slug: string): string {
  return `${withBase('drug/')}?id=${encodeURIComponent(slug)}`;
}

/**
 * 成分頁連結
 * @example ingredientUrl('tylosin') -> '/Search-VeterinaryDrug/ingredient/?slug=tylosin'
 */
export function ingredientUrl(slug: string): string {
  return `${withBase('ingredient/')}?slug=${encodeURIComponent(slug)}`;
}

/**
 * 公司頁連結（名稱先經 normalizeCompanyName 正規化再編碼）
 * @example companyUrl('大豐化學製藥股份有限公司') -> '/Search-VeterinaryDrug/company/?name=...'
 */
export function companyUrl(name: string): string {
  return `${withBase('company/')}?name=${encodeURIComponent(normalizeCompanyName(name))}`;
}

/**
 * 資料檔案連結，可附帶快取版本號
 * @example dataUrl('data/meta.json', '2026-09-23') -> '/Search-VeterinaryDrug/data/meta.json?v=2026-09-23'
 */
export function dataUrl(path: string, version?: string): string {
  const url = withBase(path);
  if (version) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(version)}`;
  }
  return url;
}
