import type { ProductStatus, ProductCategory, Restriction } from '../types/drug.js';

export function formatStatusBadge(status: ProductStatus): { text: string; className: string } {
  switch (status) {
    case 'active':
      return { text: '有效', className: 'badge badge-active' };
    case 'expired':
      return { text: '已失效', className: 'badge badge-expired' };
    case 'unknown':
    default:
      return { text: '效期未載明', className: 'badge badge-unknown' };
  }
}

export function formatCategoryText(category: ProductCategory): string {
  switch (category) {
    case 'biologic':
      return '生物製劑';
    case 'raw-material':
      return '原料藥';
    case 'general':
    default:
      return '一般藥品';
  }
}

export function formatRestrictionText(r: Restriction): string {
  if (r === 'not-laying-hens') {
    return '不含產蛋中之蛋雞';
  }
  if (r === 'not-laying-ducks') {
    return '不含產蛋中之蛋鴨';
  }
  return r;
}

export function formatField(val: string | null | undefined): string {
  if (!val || !val.trim()) return '未載明';
  return val.trim();
}

export const SPECIES_NAMES_ZH: Record<string, string> = {
  pig: '豬',
  chicken: '雞',
  duck: '鴨',
  goose: '鵝',
  turkey: '火雞',
  cattle: '牛',
  sheep: '羊',
  horse: '馬',
  dog: '犬',
  cat: '貓',
  rabbit: '兔',
  pigeon: '鴿',
  bee: '蜜蜂',
  'eel-order': '鰻形目',
  perciformes: '鱸形目',
  cypriniformes: '鯉形目',
  siluriformes: '鯰形目',
  salmoniformes: '鮭形目',
  acipenseriformes: '鱘形目',
  gonorynchiformes: '鼠鱚目',
  testudines: '龜鱉目',
  'aquatic-general': '水產動物',
};

export function getSpeciesNameZh(spId: string): string {
  return SPECIES_NAMES_ZH[spId] || spId;
}
