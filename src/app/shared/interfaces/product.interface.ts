export interface Product {
  _id: string;
  name: string;
  brand?: string;
  categories?: string[];
  categoriesName?: string[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  barcode?: string;
  weight: number;
  unit: string;
}

export type ProductVariantInput = Omit<ProductVariant, '_id'>;

export type ProductInput = Omit<Product, '_id'>;
