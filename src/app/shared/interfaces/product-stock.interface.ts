import { Product, ProductVariant } from './product.interface';

export interface ProductStock {
  _id: string;
  productId: string;
  costPrice: number;
  retailPrice: number;
  receivedQty: number;
  availableQty: number;
  receivedAt: Date;
  expiryDate?: Date | null;
  expiredQty: number;
  damagedQty: number;
  obsoleteQty: number;
  isDeadStock: boolean;
  isActive: boolean;
  isDeleted: boolean;
}

export interface ProductStockListItem {
  stockId: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  barcode: string;
  purchaseId: string;
  purchaseItemId: string;
  receivedQty: number;
  availableQty: number;
  damagedQty: number;
  expiredQty: number;
  obsoleteQty: number;
  onHandQty: number;
  costPrice: number;
  retailPrice: number;
  receivedAt: Date;
  expiryDate: Date | null;
}

export interface ProductStockListTotals {
  availableQty: number;
  damagedQty: number;
  expiredQty: number;
  obsoleteQty: number;
  onHandQty: number;
}

export interface ProductStockListResult {
  totalDocument: number;
  totals: ProductStockListTotals;
  documentItems: ProductStockListItem[];
}

export interface StockLookupResponse {
  product: Pick<Product, '_id' | 'name' | 'brand' | 'categories'>;
  variant: ProductVariant & {
    _id: string;
    isActive: boolean;
    isDeleted: boolean;
  };
  stock: {
    totalAvailableQty: number;
    batches: ProductStock[];
  };
}
