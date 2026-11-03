import type { SalesReturn } from './sales-return.interface';

export enum PAYMENT_STATUS {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FULLY_REFUNDED = 'FULLY_REFUNDED',
}

export enum SALES_RETURN_STATUS {
  NONE = 'NONE',
  PARTIALLY_RETURNED = 'PARTIALLY',
  FULLY_RETURNED = 'FULL',
}

export interface Sales {
  _id: string;
  orderNumber?: string;
  customerId?: string | null;
  customer?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  items: SalesItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  paymentStatus: PAYMENT_STATUS;
  salesReturnStatus?: SALES_RETURN_STATUS;
  returnedAmount?: number;
  salesReturns?: SalesReturn[];
  paymentMethod?: 'CASH' | 'ONLINE';
  salesDate: Date;
}

export interface SalesItem {
  _id?: string;
  productId: string;
  productVariantId: string;
  productStockId: string; // Links directly to the specific FIFO stock batch taken
  quantity: number;
  costPriceAtSale: number; // Snapshotted cost price from ProductStock for profit reporting
  soldPrice: number;
  discountAmount: number;
  product?: {
    _id: string;
    name: string;
    brand?: string;
    categories?: string[];
  };
  variant?: {
    _id: string;
    sku: string;
    barcode?: string;
    weight: number;
    unit: string;
    isActive?: boolean;
    isDeleted?: boolean;
  };
  stock?: {
    _id: string;
    availableQty?: number;
    isActive?: boolean;
    isDeleted?: boolean;
    isDeadStock?: boolean;
  };
}
