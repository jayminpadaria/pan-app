export interface Product {
  _id: string;
  name: string;
  sku?: string;
  brand?: string;
  description?: string;
  categories?: string[];
  categoriesName?: string[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  barcode: string;
  weight: number;
  unit: string;
  sizeLabel: string;
}

export type ProductVariantInput = Omit<ProductVariant, '_id'>;

export type ProductInput = Omit<Product, '_id'>;
