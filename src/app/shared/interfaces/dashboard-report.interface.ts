export interface DashboardReport {
  purchases: {
    purchaseCount: number;
    totalAmount: number;
    unitsPurchased: number;
  };
  sales: {
    salesCount: number;
    totalAmount: number;
    subTotal: number;
    taxAmount: number;
    unitsSold: number;
    costOfGoodsSold: number;
  };
  stock: {
    groups: DashboardStockGroup[];
    totals: {
      stockBatchCount: number;
      productCount: number;
      availableQty: number;
      damagedQty: number;
      expiredQty: number;
      obsoleteQty: number;
      inventoryCostValue: number;
    };
  };
}

export interface DashboardStockGroup {
  productName: string;
  variantName: string;
  sku: string;
  stockBatchCount: number;
  availableQty: number;
  damagedQty: number;
  expiredQty: number;
  obsoleteQty: number;
  inventoryCostValue: number;
  productId: string;
  variantId: string;
}
