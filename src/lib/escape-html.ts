const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * 跳脫 HTML 特殊字元 (& < > " ')
 */
export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] || char);
}
