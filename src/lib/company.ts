/**
 * 公司名稱正規化：去除前後空白，連續空白（含全形空白）合併為一個半形空白。
 * 不改大小寫與標點。空字串回傳空字串。
 */
export function normalizeCompanyName(name: string | null | undefined): string {
  if (name == null) return '';
  return String(name)
    .trim()
    .replace(/[\s　]+/g, ' ');
}

import type { CompanySummary } from '../types/drug.js';
import { matchOverviewName } from './overview-filter.js';

export type CompanyRoleFilter = 'all' | 'vendor' | 'factory';
export type CompanySortKey = 'product' | 'active' | 'name';

export interface CompanyFilterOptions {
  query: string;
  role: CompanyRoleFilter;
  includeInactive: boolean;
}

/**
 * 公司總覽過濾：同時套用有效性、角色與名稱條件。
 * includeInactive 為 false 時排除 activeCount 為 0 的公司。
 */
export function matchCompany(
  summary: CompanySummary,
  options: CompanyFilterOptions
): boolean {
  if (!options.includeInactive && summary.activeCount <= 0) return false;
  if (options.role === 'vendor' && summary.vendorCount <= 0) return false;
  if (options.role === 'factory' && summary.factoryCount <= 0) return false;
  return matchOverviewName(summary.name, options.query);
}

function compareCompanyName(a: CompanySummary, b: CompanySummary): number {
  return a.name.localeCompare(b.name, 'zh-Hant');
}

/**
 * 公司總覽排序：產品數與未失效數由多到少，同分時以名稱（zh-Hant）作為次要排序，確保順序穩定。
 */
export function compareCompanies(
  a: CompanySummary,
  b: CompanySummary,
  sortKey: CompanySortKey
): number {
  switch (sortKey) {
    case 'active':
      return b.activeCount - a.activeCount || compareCompanyName(a, b);
    case 'name':
      return compareCompanyName(a, b);
    case 'product':
    default:
      return b.productCount - a.productCount || compareCompanyName(a, b);
  }
}
