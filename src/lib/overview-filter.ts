import { normalizeCompanyName } from './company.js';

/**
 * 總覽頁名稱比對用的正規化：去除前後空白、連續空白合併為一個半形空白後轉小寫。
 * 中文不受轉小寫影響，英文比對不分大小寫。
 */
export function normalizeFilterText(text: string | null | undefined): string {
  return normalizeCompanyName(text).toLowerCase();
}

/**
 * 名稱部分比對：正規化後的查詢字串是否為正規化後名稱的子字串。
 * 空查詢（空字串、全空白、null、undefined）視為符合全部。
 */
export function matchOverviewName(
  name: string | null | undefined,
  query: string | null | undefined
): boolean {
  const q = normalizeFilterText(query);
  if (!q) return true;
  return normalizeFilterText(name).includes(q);
}
