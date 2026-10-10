import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin } from 'rxjs';
import { ListRequest } from '../../../../shared/interfaces/list.interface';
import { Purchase } from '../../../../shared/interfaces/purchase.interface';
import { Sales } from '../../../../shared/interfaces/sales.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PurchasesService } from '../../../../shared/services/purchases.service';
import { SalesService } from '../../../../shared/services/sales.service';

interface DailySummary {
  date: string;
  transactions: number;
  items: number;
  amount: number;
}

const localToday = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

@Component({
  selector: 'app-daily-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './daily-reports.component.html',
  styleUrl: './daily-reports.component.scss',
})
export class DailyReportsComponent implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly purchasesService = inject(PurchasesService);
  private readonly notification = inject(NotificationService);

  readonly startDate = new FormControl(localToday(), { nonNullable: true });
  readonly endDate = new FormControl(localToday(), { nonNullable: true });
  readonly loading = signal(false);
  readonly reportGenerated = signal(false);
  readonly salesDaily = signal<DailySummary[]>([]);
  readonly purchasesDaily = signal<DailySummary[]>([]);
  private readonly currencyFormat = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  ngOnInit() {
    this.generateReport();
  }

  generateReport() {
    const start = this.startDate.value;
    const end = this.endDate.value;
    if (!start || !end) {
      this.notification.error('Select both a start date and an end date.');
      return;
    }
    if (start > end) {
      this.notification.error('The start date must be on or before the end date.');
      return;
    }

    this.loading.set(true);
    forkJoin({
      sales: this.salesService.getAll(this.dateRangeRequest('salesDate', start, end)),
      purchases: this.purchasesService.getAll(
        this.dateRangeRequest('transactionDate', start, end),
      ),
    }).subscribe({
      next: ({ sales, purchases }) => {
        const salesRecords = sales.result?.documentItems;
        const purchaseRecords = purchases.result?.documentItems;
        if (!salesRecords || !purchaseRecords) {
          this.notification.error('The report response did not include sales and purchase records.');
          this.loading.set(false);
          return;
        }
        if (!this.allDatesValid(salesRecords, purchaseRecords)) {
          this.notification.error('The report contains a record with an invalid date.');
          this.loading.set(false);
          return;
        }

        this.salesDaily.set(this.summarizeSales(salesRecords));
        this.purchasesDaily.set(this.summarizePurchases(purchaseRecords));
        this.reportGenerated.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to generate daily reports.');
        this.loading.set(false);
      },
    });
  }

  formatDay(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }

  totalTransactions(rows: DailySummary[]) {
    return rows.reduce((total, row) => total + row.transactions, 0);
  }

  totalItems(rows: DailySummary[]) {
    return rows.reduce((total, row) => total + row.items, 0);
  }

  totalAmount(rows: DailySummary[]) {
    return this.currencyFormat.format(rows.reduce((total, row) => total + row.amount, 0));
  }

  private dateRangeRequest(columnName: string, start: string, end: string): ListRequest {
    return {
      filterList: [
        {
          columnName,
          type: 'filterDateRange',
          value: {
            startDate: `${start}T00:00:00.000Z`,
            endDate: `${end}T23:59:59.999Z`,
          },
        },
      ],
      sortHeader: columnName,
      sortDirection: 'ASC',
      page: 1,
      limit: 1000,
      isPagination: false,
    };
  }

  private allDatesValid(sales: Sales[], purchases: Purchase[]) {
    return (
      sales.every((sale) => Number.isFinite(new Date(sale.salesDate).getTime())) &&
      purchases.every((purchase) =>
        Number.isFinite(new Date(purchase.transactionDate).getTime()),
      )
    );
  }

  private summarizeSales(sales: Sales[]): DailySummary[] {
    const summaries = new Map<string, DailySummary>();
    sales.forEach((sale) => {
      const date = this.localDateKey(sale.salesDate);
      const summary = summaries.get(date) ?? { date, transactions: 0, items: 0, amount: 0 };
      summary.transactions += 1;
      summary.items += sale.items.reduce((total, item) => total + item.quantity, 0);
      summary.amount += sale.grandTotal;
      summaries.set(date, summary);
    });
    return [...summaries.values()].sort((left, right) => left.date.localeCompare(right.date));
  }

  private summarizePurchases(purchases: Purchase[]): DailySummary[] {
    const summaries = new Map<string, DailySummary>();
    purchases.forEach((purchase) => {
      const date = this.localDateKey(purchase.transactionDate);
      const summary = summaries.get(date) ?? { date, transactions: 0, items: 0, amount: 0 };
      summary.transactions += 1;
      summary.items += purchase.items.reduce((total, item) => total + item.quantity, 0);
      summary.amount += purchase.totalCostAmount;
      summaries.set(date, summary);
    });
    return [...summaries.values()].sort((left, right) => left.date.localeCompare(right.date));
  }

  private localDateKey(value: Date) {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
