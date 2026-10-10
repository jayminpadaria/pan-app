export interface Sales {
  _id: string;
  orderNumber?: string;
  customerId?: string | null;
  items: SalesItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  paymentStatus: string;
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
}
