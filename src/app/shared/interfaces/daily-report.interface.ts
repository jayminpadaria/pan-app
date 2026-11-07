export interface DailyPurchaseReportSummary {
  purchaseCount: number;
  totalAmount: number;
  itemCount: number;
  unitsPurchased: number;
}

export interface DailySalesReportSummary {
  salesCount: number;
  totalAmount: number;
  itemCount: number;
  unitsSold: number;
}

export interface DailySalesReturnReportSummary {
  salesReturnCount: number;
  totalRefundedAmount: number;
  itemCount: number;
  unitsReturned: number;
}

export interface DailyReportEntry {
  date: string;
  purchases: DailyPurchaseReportSummary;
  sales: DailySalesReportSummary;
  salesReturns: DailySalesReturnReportSummary;
}

export interface DailyReport {
  fromDate: string;
  toDate: string;
  timeZone: string;
  purchases: DailyPurchaseReportSummary;
  sales: DailySalesReportSummary;
  salesReturns: DailySalesReturnReportSummary;
  datewiseEntries: DailyReportEntry[];
}
