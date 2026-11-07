import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  DashboardReport,
  DashboardStockGroup,
} from '../../../../shared/interfaces/dashboard-report.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { DashboardReportService } from '../../../../shared/services/dashboard-report.service';

type StockLevel = 'in-stock' | 'low-stock' | 'out-of-stock';
type StockLevelCounts = Record<StockLevel, number>;
const stockSortFields = [
  'status',
  'productName',
  'variantName',
  'availableQty',
  'inventoryCostValue',
] as const;
type StockSortField = (typeof stockSortFields)[number];

const localToday = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const stockLevelOrder: Record<StockLevel, number> = {
  'in-stock': 0,
  'low-stock': 1,
  'out-of-stock': 2,
};

@Component({
  selector: 'app-daily-stock-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './daily-stock-report.component.html',
  styleUrl: './daily-stock-report.component.scss',
})
export class DailyStockReportComponent implements OnInit {
  private readonly reportService = inject(DashboardReportService);
  private readonly notification = inject(NotificationService);

  readonly reportDate = new FormControl(localToday(), { nonNullable: true });
  readonly loading = signal(false);
  readonly downloading = signal(false);
  readonly loadedDate = signal<string | null>(null);
  readonly stock = signal<DashboardReport['stock'] | null>(null);
  readonly search = signal('');
  readonly sortBy = signal<StockSortField>('status');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly stockVariantCounts = computed<StockLevelCounts>(() => {
    const counts: StockLevelCounts = { 'in-stock': 0, 'low-stock': 0, 'out-of-stock': 0 };
    for (const group of this.stock()?.groups ?? []) {
      counts[this.stockLevel(group.availableQty)] += 1;
    }
    return counts;
  });
  readonly filteredStockGroups = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const groups = (this.stock()?.groups ?? []).filter((group) => {
      if (!query) {
        return true;
      }

      return [
        group.productName,
        group.variantName,
        group.sku,
        this.stockLevelLabel(group.availableQty),
        group.availableQty,
        group.damagedQty,
        group.expiredQty,
        group.obsoleteQty,
        group.stockBatchCount,
        group.inventoryCostValue,
      ].some((value) => String(value).toLocaleLowerCase().includes(query));
    });

    return groups.sort((left, right) => {
      let comparison = this.compareStockGroups(left, right);
      if (comparison === 0) {
        comparison =
          left.productName.localeCompare(right.productName) ||
          left.variantName.localeCompare(right.variantName);
      }
      return comparison * direction;
    });
  });

  ngOnInit() {
    this.generateReport();
  }

  onReportDateChange() {
    if (this.reportDate.value !== this.loadedDate()) {
      this.stock.set(null);
      this.loadedDate.set(null);
    }
  }

  generateReport() {
    const date = this.reportDate.value;
    if (!date) {
      this.notification.error('Select a date to generate the stock report.');
      return;
    }
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.stock.set(null);
    this.loadedDate.set(null);
    this.reportService.getDashboard(date).subscribe({
      next: (response) => {
        const report = response.result;
        if (!report?.stock?.totals || !Array.isArray(report.stock.groups)) {
          this.notification.error('The stock report response did not include complete stock data.');
          this.loading.set(false);
          return;
        }

        this.stock.set(report.stock);
        this.loadedDate.set(date);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to generate the daily stock report.');
        this.loading.set(false);
      },
    });
  }

  downloadReport() {
    const date = this.loadedDate();
    if (!date || this.downloading()) {
      return;
    }

    this.downloading.set(true);
    this.reportService.downloadDashboard(date).subscribe({
      next: (pdf) => {
        if (!pdf.size) {
          this.notification.error('The daily stock report PDF was empty.');
          this.downloading.set(false);
          return;
        }

        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = `daily-stock-report-${date}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.notification.success('Daily stock report downloaded successfully.');
        this.downloading.set(false);
      },
      error: () => {
        this.notification.error('Failed to download the daily stock report.');
        this.downloading.set(false);
      },
    });
  }

  stockLevel(quantity: number): StockLevel {
    if (quantity <= 0) {
      return 'out-of-stock';
    }
    return quantity <= 11 ? 'low-stock' : 'in-stock';
  }

  stockLevelLabel(quantity: number) {
    const level = this.stockLevel(quantity);
    if (level === 'out-of-stock') {
      return 'Out of stock';
    }
    return level === 'low-stock' ? 'Low stock' : 'In stock';
  }

  stockLevelClass(quantity: number) {
    return `stock-${this.stockLevel(quantity)}`;
  }

  onSearch(event: Event) {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.search.set(input.value);
    }
  }

  onSortChange(event: Event) {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const field = stockSortFields.find((candidate) => candidate === select.value);
    if (field) {
      this.sortBy.set(field);
    }
  }

  toggleSortDirection() {
    this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
  }

  private compareStockGroups(left: DashboardStockGroup, right: DashboardStockGroup) {
    switch (this.sortBy()) {
      case 'status':
        return (
          stockLevelOrder[this.stockLevel(left.availableQty)] -
          stockLevelOrder[this.stockLevel(right.availableQty)]
        );
      case 'productName':
        return left.productName.localeCompare(right.productName);
      case 'variantName':
        return left.variantName.localeCompare(right.variantName);
      case 'availableQty':
        return left.availableQty - right.availableQty;
      case 'inventoryCostValue':
        return left.inventoryCostValue - right.inventoryCostValue;
    }
  }
}
