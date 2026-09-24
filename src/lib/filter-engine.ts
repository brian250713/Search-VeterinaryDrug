import type { Product, ProductCategory, ProductStatus } from '../types/drug.js';

export interface FilterOptions {
  species?: string;
  dosageCategory?: string;
  ingredientType?: 'all' | 'single' | 'compound';
  origin?: 'all' | '國產' | '輸入';
  includeExpired?: boolean;
  includeBiologic?: boolean;
  includeRawMaterial?: boolean;
  includeExportOnly?: boolean;
  expandRestrictedLaying?: boolean;
}

export interface FilterResult<T> {
  items: T[];
  totalMatching: number;
  hiddenExpiredCount: number;
  excludedLayingCount: number;
}

const AQUATIC_SPECIES = new Set([
  'eel-order',
  'perciformes',
  'cypriniformes',
  'siluriformes',
  'salmoniformes',
  'acipenseriformes',
  'gonorynchiformes',
  'testudines',
  'aquatic-general',
]);

export function filterProducts<T extends Pick<Product, 'status' | 'category' | 'exportOnly' | 'origin' | 'dosageForm' | 'isSingleIngredient' | 'speciesIndications'>>(
  products: T[],
  options: FilterOptions = {}
): FilterResult<T> {
  const {
    species = '',
    dosageCategory = '',
    ingredientType = 'all',
    origin = 'all',
    includeExpired = false,
    includeBiologic = false,
    includeRawMaterial = false,
    includeExportOnly = false,
    expandRestrictedLaying = false,
  } = options;

  let hiddenExpiredCount = 0;
  let excludedLayingCount = 0;

  const filtered = products.filter((prod) => {
    // 1. Classification & exportOnly filters
    if (!includeBiologic && prod.category === 'biologic') {
      return false;
    }
    if (!includeRawMaterial && prod.category === 'raw-material') {
      return false;
    }
    if (!includeExportOnly && prod.exportOnly) {
      return false;
    }

    // 2. Status filter
    if (prod.status === 'expired') {
      if (!includeExpired) {
        hiddenExpiredCount++;
        return false;
      }
    }

    // 3. Origin
    if (origin !== 'all' && prod.origin !== origin) {
      return false;
    }

    // 4. Dosage form category
    if (dosageCategory && prod.dosageForm.category !== dosageCategory) {
      return false;
    }

    // 5. Single / Compound
    if (ingredientType === 'single' && !prod.isSingleIngredient) {
      return false;
    }
    if (ingredientType === 'compound' && prod.isSingleIngredient) {
      return false;
    }

    // 6. Species & Egg-laying restriction filtering
    if (species) {
      const indications = prod.speciesIndications || [];

      if (species === 'aquatic') {
        const matchesAquatic = indications.some((ind) => AQUATIC_SPECIES.has(ind.species));
        if (!matchesAquatic) return false;
      } else if (species === 'laying-hen') {
        // Must apply to chicken
        const chickenInd = indications.find((ind) => ind.species === 'chicken');
        if (!chickenInd) return false;

        const hasHenRestriction = chickenInd.restrictions.includes('not-laying-hens');
        if (hasHenRestriction) {
          if (!expandRestrictedLaying) {
            excludedLayingCount++;
            return false;
          }
        }
      } else if (species === 'laying-duck') {
        // Must apply to duck
        const duckInd = indications.find((ind) => ind.species === 'duck');
        if (!duckInd) return false;

        const hasDuckRestriction = duckInd.restrictions.includes('not-laying-ducks');
        if (hasDuckRestriction) {
          if (!expandRestrictedLaying) {
            excludedLayingCount++;
            return false;
          }
        }
      } else {
        // Standard species (e.g. 'chicken', 'duck', 'pig', 'cattle', etc.)
        const match = indications.some((ind) => ind.species === species);
        if (!match) return false;
      }
    }

    return true;
  });

  return {
    items: filtered,
    totalMatching: filtered.length,
    hiddenExpiredCount,
    excludedLayingCount,
  };
}
