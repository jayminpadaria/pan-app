export interface ProfitAndLossSummary {
  salesCount: number;
  salesReturnCount: number;
  salesAmount: number;
  salesReturns: number;
  totalIncome: number;
  costOfGoodsSold: number;
  returnedGoodsCost: number;
  expiredStockWriteOff: number;
  obsoleteStockWriteOff: number;
  stockWriteOffs: number;
  totalExpenses: number;
  netProfitLoss: number;
  financialResult: string;
}

export interface ProfitAndLossEntry {
  date: string;
  salesAmount: number;
  salesReturns: number;
  totalIncome: number;
  costOfGoodsSold: number;
  returnedGoodsCost: number;
  expiredStockWriteOff: number;
  obsoleteStockWriteOff: number;
  stockWriteOffs: number;
  totalExpenses: number;
  netProfitLoss: number;
  financialResult: string;
}

export interface ProfitAndLossReport {
  fromDate: string;
  toDate: string;
  timeZone: string;
  summary: ProfitAndLossSummary;
  datewiseEntries: ProfitAndLossEntry[];
}
