export enum SOURCE_TYPE {
  EXTERNAL_VENDOR = 'EXTERNAL_VENDOR',
  INTERNAL_PRODUCTION = 'INTERNAL_PRODUCTION',
}

export interface Purchase {
  _id: string;
  invoiceNumber: string;
  sourceType: SOURCE_TYPE;
  supplierId?: string | null;
  supplierName?: string | null;
  items: PurchaseItem[];
  totalCostAmount: number;
  status: string;
  transactionDate: Date;
}

export interface PurchaseItem {
  _id?: string;
  productId: string;
  productVariantId: string;
  batchNumber: string;
  quantity: number;
  costPrice: number; // Total cost to produce or buy 1 unit
  retailPrice: number; // Intended base selling price
  expiryDate?: Date | null;
}
