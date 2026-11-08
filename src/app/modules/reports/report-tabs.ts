export interface ReportTab {
  label: string;
  path: string;
  roles: readonly string[];
}

export const REPORT_TABS: readonly ReportTab[] = [
  { label: 'Daily Transactions', path: 'daily-transactions', roles: ['admin', 'manager'] },
  { label: 'Daily Stock', path: 'daily-stock', roles: ['admin', 'manager'] },
  { label: 'Profit & Loss', path: 'profit-and-loss', roles: ['admin', 'manager'] },
  { label: 'Email Report', path: 'email', roles: ['admin', 'manager', 'user'] },
];
