/**
 * 成分頁與公司頁共用的產品清單模組（純函式，可直接以 Vitest 測試）。
 * 由 src/pages/ingredient/index.astro 搬出並參數化，行為與原頁面一致，
 * 另新增類別（生物製劑／原料藥）與角色（申請業者／製造廠）篩選給公司頁使用。
 */
import type { CompanyRole, ProductCategory, ProductStatus } from '../types/drug.js';
import { AQUATIC_SPECIES } from './filter-engine.js';
import { SPECIES_NAMES_ZH } from './display-helpers.js';
import { escapeHtml } from './escape-html.js';
import { drugUrl, ingredientUrl, companyUrl } from './url.js';

/** 可列入清單的產品摘要最小結構（ProductSummary 與 CompanyProductSummary 皆符合） */
export interface ListedProduct {
  slug: string;
  licenseNo: string;
  nameZh: string;
  nameEn: string;
  origin: '國產' | '輸入';
  category: ProductCategory;
  status: ProductStatus;
  expiryDate: string | null;
  dosageFormCategory: string;
  isSingleIngredient: boolean;
  ingredients: { name: string; slug: string; chineseName?: string }[];
  speciesIndications: { species: string; restrictions: string[] }[];
  vendorName: string;
  factoryName: string;
  roles?: CompanyRole[];
}

export type ProductListRole = 'all' | CompanyRole;

export interface ProductListFilterOptions {
  species?: string;
  dosageCategory?: string;
  origin?: 'all' | '國產' | '輸入';
  includeExpired?: boolean;
  includeBiologic?: boolean;
  includeRawMaterial?: boolean;
  role?: ProductListRole;
  expandLaying?: boolean;
}

export interface ProductListFilterResult<T extends ListedProduct> {
  items: T[];
  /** 蛋雞／蛋鴨限制被預設排除的數量 */
  excludedLayingCount: number;
  /** 單獨勾選「包含已失效」後會多顯示的產品數（套用目前其他條件） */
  hiddenExpiredCount: number;
  /** 單獨勾選「包含生物製劑」後會多顯示的產品數（套用目前其他條件） */
  hiddenBiologicCount: number;
  /** 單獨勾選「包含原料藥」後會多顯示的產品數（套用目前其他條件） */
  hiddenRawMaterialCount: number;
}

type ResolvedFilterOptions = Required<ProductListFilterOptions>;
type MatchResult = 'match' | 'laying-excluded' | 'no-match';

function matchProduct(p: ListedProduct, opts: ResolvedFilterOptions): MatchResult {
  // 1. 角色篩選（公司頁）
  if (opts.role !== 'all' && !(p.roles || []).includes(opts.role)) return 'no-match';

  // 2. 類別預設篩選（成分頁資料全為一般藥品，不受影響）
  if (!opts.includeBiologic && p.category === 'biologic') return 'no-match';
  if (!opts.includeRawMaterial && p.category === 'raw-material') return 'no-match';

  // 3. 效期、產地、劑型篩選
  if (!opts.includeExpired && p.status === 'expired') return 'no-match';
  if (opts.origin !== 'all' && p.origin !== opts.origin) return 'no-match';
  if (opts.dosageCategory && p.dosageFormCategory !== opts.dosageCategory) return 'no-match';

  // 4. 物種（含水產、蛋雞／蛋鴨）篩選
  const species = opts.species;
  if (species) {
    const indications = p.speciesIndications || [];
    if (species === 'aquatic') {
      if (!indications.some((i) => AQUATIC_SPECIES.has(i.species))) return 'no-match';
    } else if (species === 'laying-hen' || species === 'laying-duck') {
      const base = species === 'laying-hen' ? 'chicken' : 'duck';
      const restriction = species === 'laying-hen' ? 'not-laying-hens' : 'not-laying-ducks';
      const ind = indications.find((i) => i.species === base);
      if (!ind) return 'no-match';
      if (ind.restrictions && ind.restrictions.includes(restriction) && !opts.expandLaying) {
        return 'laying-excluded';
      }
    } else if (!indications.some((i) => i.species === species)) {
      return 'no-match';
    }
  }

  return 'match';
}

export function filterProducts<T extends ListedProduct>(
  products: T[],
  options: ProductListFilterOptions = {}
): ProductListFilterResult<T> {
  const opts: ResolvedFilterOptions = {
    species: '',
    dosageCategory: '',
    origin: 'all',
    includeExpired: false,
    includeBiologic: false,
    includeRawMaterial: false,
    role: 'all',
    expandLaying: false,
    ...options,
  };

  const items: T[] = [];
  let excludedLayingCount = 0;
  for (const p of products) {
    const result = matchProduct(p, opts);
    if (result === 'match') items.push(p);
    else if (result === 'laying-excluded') excludedLayingCount++;
  }

  // 單獨放寬某一個預設條件時，會多出來的產品數
  const countRevealed = (relax: Partial<ResolvedFilterOptions>): number => {
    const relaxed = { ...opts, ...relax };
    return products.filter(
      (p) => matchProduct(p, opts) !== 'match' && matchProduct(p, relaxed) === 'match'
    ).length;
  };

  return {
    items,
    excludedLayingCount,
    hiddenExpiredCount: opts.includeExpired ? 0 : countRevealed({ includeExpired: true }),
    hiddenBiologicCount: opts.includeBiologic ? 0 : countRevealed({ includeBiologic: true }),
    hiddenRawMaterialCount: opts.includeRawMaterial ? 0 : countRevealed({ includeRawMaterial: true }),
  };
}

export interface DosageGroup<T extends ListedProduct> {
  category: string;
  products: T[];
}

export interface GroupedProducts<T extends ListedProduct> {
  single: DosageGroup<T>[];
  compound: DosageGroup<T>[];
}

/** 單方／複方 → 劑型大類分組（劑型組維持首次出現順序） */
export function groupProducts<T extends ListedProduct>(products: T[]): GroupedProducts<T> {
  const singleList = products.filter((p) => p.isSingleIngredient);
  const compoundList = products.filter((p) => !p.isSingleIngredient);
  return {
    single: groupByDosage(singleList),
    compound: groupByDosage(compoundList),
  };
}

function groupByDosage<T extends ListedProduct>(items: T[]): DosageGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const p of items) {
    const cat = p.dosageFormCategory || '其他劑型';
    const list = map.get(cat) || [];
    list.push(p);
    map.set(cat, list);
  }
  return [...map.entries()].map(([category, list]) => ({ category, products: list }));
}

export type ProductCardContext =
  | { mode: 'ingredient'; currentIngredientSlug: string; isCompared: boolean }
  | { mode: 'company'; companyName: string; isCompared: boolean };

/** 公司名稱：不為空白時連到公司頁，空白時顯示「未載明」且不加連結 */
export function renderCompanyLink(name: string | null | undefined): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '未載明';
  return `<a href="${companyUrl(trimmed)}">${escapeHtml(trimmed)}</a>`;
}

function formatRoleBadge(roles: CompanyRole[] | undefined): string {
  const hasVendor = roles?.includes('vendor');
  const hasFactory = roles?.includes('factory');
  let text = '';
  if (hasVendor && hasFactory) text = '申請業者・製造廠';
  else if (hasVendor) text = '申請業者';
  else if (hasFactory) text = '製造廠';
  if (!text) return '';
  return `<span class="badge" style="background-color: #e0e7ff; color: #3730a3;">${text}</span>`;
}

function formatCategoryBadge(category: ProductCategory): string {
  if (category === 'biologic') {
    return `<span class="badge" style="background-color: #f3e8ff; color: #6b21a8;">生物製劑</span>`;
  }
  if (category === 'raw-material') {
    return `<span class="badge" style="background-color: #fef9c3; color: #854d0e;">原料藥</span>`;
  }
  return '';
}

/**
 * 產品卡片 HTML（字串）。所有插值欄位皆經 escapeHtml()，公司網址經 companyUrl()。
 * - ingredient 模式：複方顯示「複方包含」其他成分連結（成分頁）。
 * - company 模式：顯示角色標記、全部標準成分連結、非一般藥品的類別標記（公司頁）。
 */
export function renderProductCard<T extends ListedProduct>(p: T, ctx: ProductCardContext): string {
  let statusTag = '';
  if (p.status === 'active') statusTag = '<span class="badge badge-active">有效</span>';
  else if (p.status === 'expired') statusTag = '<span class="badge badge-expired">已失效</span>';
  else statusTag = '<span class="badge badge-unknown">效期未載明</span>';

  const roleBadge = ctx.mode === 'company' ? formatRoleBadge(p.roles) : '';
  const categoryBadge = ctx.mode === 'company' ? formatCategoryBadge(p.category) : '';

  const speciesTags = (p.speciesIndications || [])
    .map((sp) => {
      const name = escapeHtml(SPECIES_NAMES_ZH[sp.species] || sp.species);
      let restr = '';
      if (sp.restrictions && sp.restrictions.includes('not-laying-hens')) {
        restr = ' <span style="color:#b45309;">(不含產蛋蛋雞)</span>';
      } else if (sp.restrictions && sp.restrictions.includes('not-laying-ducks')) {
        restr = ' <span style="color:#b45309;">(不含產蛋蛋鴨)</span>';
      }
      return `<span style="font-size:0.75rem; background:#f9fafb; border:1px solid #e5e7eb; padding:0.1rem 0.35rem; border-radius:4px; margin-right:0.25rem;">${name}${restr}</span>`;
    })
    .slice(0, 6)
    .join('');

  let ingredientHtml = '';
  if (ctx.mode === 'ingredient') {
    if (!p.isSingleIngredient) {
      const others = p.ingredients.filter((i) => i.slug !== ctx.currentIngredientSlug);
      if (others.length > 0) {
        const otherLinks = others
          .map((i) => {
            return `<a href="${ingredientUrl(i.slug)}" style="font-size:0.8rem; margin-right:0.25rem;">+${escapeHtml(i.name)}</a>`;
          })
          .join(' ');
        ingredientHtml = `<div style="font-size:0.8rem; color:#6b7280; border-top:1px dashed #e5e7eb; padding-top:0.3rem; overflow-wrap:anywhere;">複方包含：${otherLinks}</div>`;
      }
    }
  } else {
    const ingLinks = (p.ingredients || [])
      .map((i) => {
        const cn = i.chineseName ? ` (${escapeHtml(i.chineseName)})` : '';
        return `<a href="${ingredientUrl(i.slug)}" style="font-size:0.8rem; margin-right:0.25rem;">${escapeHtml(i.name)}${cn}</a>`;
      })
      .join(' ');
    ingredientHtml = `<div style="font-size:0.8rem; color:#6b7280; border-top:1px dashed #e5e7eb; padding-top:0.3rem; overflow-wrap:anywhere;">成分：${ingLinks || '無標準成分'}</div>`;
  }

  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
      <div>
        <div style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.2rem; flex-wrap:wrap;">
          ${statusTag}
          ${roleBadge}
          ${categoryBadge}
          <span style="font-size:0.75rem; color:#6b7280;">${escapeHtml(p.licenseNo)}</span>
        </div>
        <a href="${drugUrl(p.slug)}" style="font-weight:700; color:#111827; font-size:1.05rem;">${escapeHtml(p.nameZh)}</a>
        ${p.nameEn ? `<div style="font-size:0.8rem; color:#6b7280;">${escapeHtml(p.nameEn)}</div>` : ''}
      </div>
      <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; cursor:pointer; background:#f9fafb; padding:0.25rem 0.4rem; border-radius:4px; border:1px solid #e5e7eb; white-space:nowrap;">
        <input type="checkbox" class="compare-chk" data-slug="${escapeHtml(p.slug)}" ${ctx.isCompared ? 'checked' : ''} />
        <span>比較</span>
      </label>
    </div>

    <div style="font-size:0.8rem; color:#4b5563;">
      <div>業者：${renderCompanyLink(p.vendorName)}</div>
      <div>製造廠：${renderCompanyLink(p.factoryName)}</div>
      <div>效期：${escapeHtml(p.expiryDate || '未載明')}</div>
    </div>

    ${ingredientHtml}

    ${speciesTags ? `<div style="border-top:1px dashed #e5e7eb; padding-top:0.3rem;">${speciesTags}</div>` : ''}
  `;
}
