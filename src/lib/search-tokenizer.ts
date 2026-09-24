/**
 * CJK bigram + alphanumeric tokenizer for MiniSearch
 */
export function cjkBigramTokenizer(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const tokens: string[] = [];

  // Match CJK character blocks and non-CJK words
  // CJK range: \u4e00-\u9fa5, \u3400-\u4dbf, etc.
  const cjkRegex = /[\u4e00-\u9fa5]/g;
  const nonCjkWords = normalized.split(/[^a-z0-9]+/i).filter((s) => s.length > 0);

  tokens.push(...nonCjkWords);

  // Extract CJK continuous segments
  const cjkSegments = normalized.match(/[\u4e00-\u9fa5]+/g) || [];

  for (const seg of cjkSegments) {
    // Unigrams
    for (let i = 0; i < seg.length; i++) {
      tokens.push(seg[i]);
    }
    // Bigrams
    for (let i = 0; i < seg.length - 1; i++) {
      tokens.push(seg.slice(i, i + 2));
    }
  }

  return tokens;
}
