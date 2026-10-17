export enum INVENTORY_UNIT {
  MILLIGRAM = 'mg',
  GRAM = 'gm',
  KILOGRAM = 'kg',
  MILLILITER = 'ml',
  LITER = 'l',
  PIECE = 'piece',
}

export interface Product {
  _id: string;
  name: string;
  brand?: string;
  categories?: string[];
  categoriesName?: string[];
  variants?: ProductVariant[];
  isInUse?: boolean;
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  barcode?: string;
  weight: number;
  unit: string;
  isInUse?: boolean;
}

export type ProductVariantInput = Omit<ProductVariant, '_id'>;

export type ProductInput = Omit<Product, '_id'>;
