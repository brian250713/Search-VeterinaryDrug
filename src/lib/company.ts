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
