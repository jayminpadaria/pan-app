import { Product, ProductVariant } from './product.interface';

export interface ProductStock {
  _id: string;
  productId: string;
  batchNumber: string;
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
