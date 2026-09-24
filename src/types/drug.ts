export interface RawRecord {
  許可證字號: string;
  動物用藥品中文名稱: string;
  動物用藥品英文名稱: string;
  業者名稱: string;
  業者地址: string;
  製造廠名稱: string;
  製造廠地址: string;
  劑型: string;
  包裝: string;
  '效能(適應症)': string;
  成分: string;
  核發日期: string;
  有效期間: string;
  外銷專用: string;
}

export type ProductStatus = 'active' | 'expired' | 'unknown';
export type ProductCategory = 'general' | 'biologic' | 'raw-material';

export type Restriction = 'not-laying-hens' | 'not-laying-ducks' | string;

export interface SpeciesIndication {
  species: string;
  label: string;
  restrictions: Restriction[];
  generic: boolean;
  indication: string;
}

export interface ProductIngredient {
  name: string;
  chineseName?: string;
  originalText: string;
  verified: boolean;
  slug: string;
}

export interface DosageFormInfo {
  raw: string;
  category: string;
  subcategory?: string;
}

export interface Product {
  slug: string;
  licenseNo: string;
  origin: '國產' | '輸入';
  category: ProductCategory;
  exportOnly: boolean;
  nameZh: string;
  nameEn: string;
  vendorName: string;
  vendorAddress: string;
  factoryName: string;
  factoryAddress: string;
  dosageForm: DosageFormInfo;
  package: string;
  status: ProductStatus;
  issueDate: string | null;
  expiryDate: string | null;
  isSingleIngredient: boolean;
  ingredients: ProductIngredient[];
  ingredientsText: string;
  speciesIndications: SpeciesIndication[];
  indicationText: string;
}

export interface Ingredient {
  slug: string;
  name: string;
  chineseName: string;
  aliases: string[];
  verified: boolean;
  productCount: number;
  singleProductCount: number;
  compoundProductCount: number;
}

export interface CompareProductItem {
  slug: string;
  licenseNo: string;
  origin: '國產' | '輸入';
  nameZh: string;
  nameEn: string;
  vendorName: string;
  factoryName: string;
  dosageFormCategory: string;
  dosageFormRaw: string;
  status: ProductStatus;
  isSingleIngredient: boolean;
  ingredients: ProductIngredient[];
  ingredientsText: string;
  speciesIndications: SpeciesIndication[];
}

export interface Meta {
  fetchedAt: string;
  normalizedAt: string;
  totalRecords: number;
  activeRecords: number;
  expiredRecords: number;
  unknownRecords: number;
  generalRecords: number;
  biologicRecords: number;
  rawMaterialRecords: number;
  exportOnlyRecords: number;
}

export interface ProductSummaryIngredient {
  name: string;
  slug: string;
  chineseName?: string;
}

export interface ProductSummarySpeciesIndication {
  species: string;
  label: string;
  restrictions: Restriction[];
  generic: boolean;
}

export interface ProductSummary {
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
  ingredients: ProductSummaryIngredient[];
  speciesIndications: ProductSummarySpeciesIndication[];
  vendorName: string;
  factoryName: string;
  exportOnly: boolean;
}

export type CompanyRole = 'vendor' | 'factory';

export interface CompanyProductSummary extends ProductSummary {
  roles: CompanyRole[];
}

export interface CompanyInfo {
  name: string;
  addresses: string[];
  vendorCount: number;
  factoryCount: number;
}

export interface CompanyDetailShard {
  [name: string]: {
    company: CompanyInfo;
    products: CompanyProductSummary[];
  };
}

export interface CompanySummary {
  name: string;
  productCount: number;
  activeCount: number;
  vendorCount: number;
  factoryCount: number;
}

export interface IngredientDetailShard {
  [slug: string]: {
    ingredient: Ingredient;
    products: ProductSummary[];
  };
}

export interface ProductShard {
  [slug: string]: Product;
}
