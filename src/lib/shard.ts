export const DRUG_SHARDS = 128;
export const INGREDIENT_SHARDS = 64;

/**
 * 32-bit FNV-1a hash algorithm
 * @param str ASCII key / slug
 */
export function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * 計算 key 對應的分片編號 (0-indexed)
 */
export function shardOf(key: string, count: number): number {
  return fnv1a32(key) % count;
}

/**
 * 取得分片路徑（不含 base 前綴）
 * 例：data/drug/042.json
 */
export function shardPath(kind: 'drug' | 'ingredient' | string, n: number): string {
  return `data/${kind}/${String(n).padStart(3, '0')}.json`;
}
