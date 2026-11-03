export type SalesReturnPaymentMethod = 'CASH' | 'ONLINE';

export interface SalesReturnItem {
  _id?: string;
  productVariantId: string;
  productStockId: string;
  quantity: number;
  refundPricePerUnit: number;
  restockInventory: boolean;
  reason: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SalesReturn {
  _id: string;
  salesReturnNumber: string;
  salesId: string;
  items: SalesReturnItem[];
  totalRefundedToCustomer: number;
  paymentMethod?: SalesReturnPaymentMethod;
  returnDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
