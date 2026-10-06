export interface Product {
  _id: string;
  name: string;
  sku?: string;
  brand?: string;
  description?: string;
  categories?: string[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  sku: string;
  barcode: string;
  weight: number;
  unit: string;
  sizeLabel: string;
}

export type ProductInput = Omit<Product, '_id'>;
