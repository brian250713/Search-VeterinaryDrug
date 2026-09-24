import type { Ingredient, Product, ProductIngredient } from '../types/drug.js';
import { cleanHtml } from './normalizer-basic.js';

export function toIngredientSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SynonymItem {
  slug: string;
  name: string;
  chineseName?: string;
  aliases?: string[];
  verified?: boolean;
}

export class IngredientNormalizer {
  private lookupMap: Map<string, SynonymItem> = new Map();

  constructor(synonyms: SynonymItem[] = []) {
    this.loadSynonyms(synonyms);
  }

  public loadSynonyms(synonyms: SynonymItem[]) {
    this.lookupMap.clear();
    for (const item of synonyms) {
      this.lookupMap.set(item.name.toUpperCase().trim(), item);
      if (item.chineseName) {
        this.lookupMap.set(item.chineseName.toUpperCase().trim(), item);
      }
      if (item.aliases) {
        for (const alias of item.aliases) {
          this.lookupMap.set(alias.toUpperCase().trim(), item);
        }
      }
    }
  }

  public extractIngredients(
    rawText: string | undefined | null,
    isBiologic = false
  ): {
    ingredients: ProductIngredient[];
    cleanedText: string;
    isSingleIngredient: boolean;
  } {
    const cleanedText = cleanHtml(rawText);

    if (isBiologic || !cleanedText.trim()) {
      return {
        ingredients: [],
        cleanedText,
        isSingleIngredient: false,
      };
    }

    const segments = this.splitSegments(cleanedText);
    const extractedList: ProductIngredient[] = [];
    const seenNames = new Set<string>();

    for (const seg of segments) {
      const baseName = this.extractBaseName(seg);
      if (!baseName || baseName.length < 2) continue;

      // Avoid pure numbers or common non-ingredient tokens
      if (/^\d+$/.test(baseName) || baseName === 'EACH') continue;

      // Filter out chemical formulas like C16H19N3O5S
      if (/^[A-Z0-9·\-\+]{10,}$/.test(baseName) && /\d/.test(baseName)) continue;

      // Filter out long explanatory sentences
      if (baseName.length > 40 || baseName.startsWith('本品') || baseName.includes('不得少於')) continue;

      const upperBase = baseName.toUpperCase();
      const matched = this.lookupMap.get(upperBase);

      const standardName = matched ? matched.name : upperBase;
      const chineseName = matched?.chineseName || undefined;
      const verified = matched ? true : false;

      // If not verified, reject if it has no English letters or contains prefix noise
      if (!verified) {
        if (!/[A-Z]/.test(upperBase)) continue;
        if (/[\u4e00-\u9fa5]/.test(baseName) && (
          baseName.includes('含有') ||
          baseName.includes('相當於') ||
          baseName.includes('含量') ||
          baseName.includes('中含') ||
          baseName.length > 20
        )) {
          continue;
        }
      }

      if (!seenNames.has(standardName)) {
        seenNames.add(standardName);
        const slug = matched?.slug || toIngredientSlug(standardName);
        extractedList.push({
          name: standardName,
          chineseName,
          originalText: baseName,
          verified,
          slug,
        });
      }
    }

    const isSingleIngredient = extractedList.length === 1;

    return {
      ingredients: extractedList,
      cleanedText,
      isSingleIngredient,
    };
  }

  private splitSegments(text: string): string[] {
    // Replace Chinese punctuation and delimiters with newlines
    let normalized = text
      .replace(/[\r\n]+/g, '\n')
      .replace(/[;；]/g, '\n')
      // Split on comma/ideographic comma when separating english/latin ingredients
      .replace(/([A-Za-z0-9\)])\s*[,、]\s*([A-Za-z])/g, '$1\n$2');

    return normalized
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  public extractBaseName(segment: string): string {
    let s = segment.toUpperCase().trim();

    // 1. Remove prefixes
    const prefixRegex =
      /^(?:EACH\s+\S+\s+CONTAINS[:：]?|EACH\s+CONTAINS[:：]?|EACH\s*[:：]|每(?:ML|公撮|毫升|瓶|錠|公克|GM|CAPSULE|劑|KG|公斤)(?:\s*中)?\s*含(?:有)?[:：]?|COMPOSITION[:：]?|INGREDIENTS?[:：]?)/i;
    s = s.replace(prefixRegex, '').trim();

    // 2. Remove bracketed parts like (AS TRIHYDRATE), (POTENCY)
    s = s.replace(/\([^)]*\)/g, ' ').replace(/（[^）]*）/g, ' ');

    // 3. Remove dosages and units and anything following them in this line
    // e.g. "FLORFENICOL 200 MG", "100MG", "5 GM", "10%", "20 W/V%"
    s = s.replace(
      /\s+\d+(?:\.\d+)?\s*(?:MG|GM|G|KG|ML|IU|%|W\/V%|MCG|UG|PPM|TABLET|DOSE)\b.*/i,
      ''
    );
    s = s.replace(
      /\d+(?:\.\d+)?\s*(?:MG|GM|G|KG|ML|IU|%|MCG|UG)\b.*/i,
      ''
    );

    // 4. Remove common salt / compound suffixes
    const saltRegex =
      /\b(?:TRIHYDRATE|HYDROCHLORIDE|HCL|SULFATE|SULPHATE|SODIUM|POTASSIUM|TARTRATE|HYCLATE|FUMARATE|PHOSPHATE|PROPIONATE|ACETATE|NITRATE|MESYLATE|CITRATE|MALEATE|SUCCINATE|DISODIUM|MONOHYDRATE|DIHYDRATE|CALCIUM|ZINC|BASE)\b/gi;
    s = s.replace(saltRegex, ' ');

    // 5. Clean up extra whitespace and punctuation
    s = s.replace(/[\s\.\:\,\-\/]+$/, '').replace(/^[\s\.\:\,\-\/]+/, '').trim();
    s = s.replace(/\s{2,}/g, ' ');

    return s;
  }
}

/**
 * 彙總所有產品的成分，以 slug 為 key 合併
 */
export function aggregateIngredients(products: Product[]): Ingredient[] {
  interface AggregatedIngredient {
    slug: string;
    nameProductCounts: Map<string, number>;
    chineseNames: Map<string, string>;
    verified: boolean;
    productSlugs: Set<string>;
    singleProductSlugs: Set<string>;
    compoundProductSlugs: Set<string>;
  }

  const ingredientMapBySlug = new Map<string, AggregatedIngredient>();

  for (const prod of products) {
    if (prod.category === 'biologic') continue;

    const slugsInThisProduct = new Set<string>();
    const namesInThisProductBySlug = new Map<string, Set<string>>();

    for (const ing of prod.ingredients) {
      const slug = ing.slug || toIngredientSlug(ing.name);
      if (!slug) continue;

      slugsInThisProduct.add(slug);

      if (!namesInThisProductBySlug.has(slug)) {
        namesInThisProductBySlug.set(slug, new Set());
      }
      namesInThisProductBySlug.get(slug)!.add(ing.name);

      let agg = ingredientMapBySlug.get(slug);
      if (!agg) {
        agg = {
          slug,
          nameProductCounts: new Map(),
          chineseNames: new Map(),
          verified: false,
          productSlugs: new Set(),
          singleProductSlugs: new Set(),
          compoundProductSlugs: new Set(),
        };
        ingredientMapBySlug.set(slug, agg);
      }

      if (ing.verified) {
        agg.verified = true;
      }
      if (ing.chineseName) {
        agg.chineseNames.set(ing.name, ing.chineseName);
      }
    }

    for (const slug of slugsInThisProduct) {
      const agg = ingredientMapBySlug.get(slug)!;
      agg.productSlugs.add(prod.slug);
      if (prod.isSingleIngredient) {
        agg.singleProductSlugs.add(prod.slug);
      } else {
        agg.compoundProductSlugs.add(prod.slug);
      }

      const names = namesInThisProductBySlug.get(slug)!;
      for (const name of names) {
        agg.nameProductCounts.set(name, (agg.nameProductCounts.get(name) || 0) + 1);
      }
    }
  }

  const ingredientsList: Ingredient[] = [];
  for (const agg of ingredientMapBySlug.values()) {
    const sortedNames = Array.from(agg.nameProductCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      if (a[0].length !== b[0].length) return a[0].length - b[0].length;
      return a[0].localeCompare(b[0]);
    });

    const standardName = sortedNames[0][0];
    const aliases = sortedNames.slice(1).map(([n]) => n);
    let chineseName = agg.chineseNames.get(standardName) || '';
    if (!chineseName) {
      for (const cn of agg.chineseNames.values()) {
        if (cn) {
          chineseName = cn;
          break;
        }
      }
    }

    ingredientsList.push({
      slug: agg.slug,
      name: standardName,
      chineseName,
      aliases,
      verified: agg.verified,
      productCount: agg.productSlugs.size,
      singleProductCount: agg.singleProductSlugs.size,
      compoundProductCount: agg.compoundProductSlugs.size,
    });
  }

  return ingredientsList.sort((a, b) => b.productCount - a.productCount);
}
