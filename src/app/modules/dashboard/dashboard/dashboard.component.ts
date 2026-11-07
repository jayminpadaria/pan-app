import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { interval } from 'rxjs';
import {
  DashboardReport,
  DashboardStockGroup,
} from '../../../shared/interfaces/dashboard-report.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { DashboardReportService } from '../../../shared/services/dashboard-report.service';

type StockLevel = 'in-stock' | 'low-stock' | 'out-of-stock';
type StockLevelCounts = Record<StockLevel, number>;
const STOCK_SORT_FIELDS = [
  'status',
  'productName',
  'variantName',
  'availableQty',
  'inventoryCostValue',
] as const;
type StockSortField = (typeof STOCK_SORT_FIELDS)[number];

const localDateKey = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardReportService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly now = signal(new Date());
  readonly requestedDate = signal(localDateKey(new Date()));
  readonly loading = signal(false);
  readonly dashboard = signal<DashboardReport | null>(null);
  readonly downloadingReports = signal(false);
  readonly stockSearch = signal('');
  readonly stockSortBy = signal<StockSortField>('status');
  readonly stockSortDirection = signal<'asc' | 'desc'>('asc');
  readonly stockVariantCounts = computed<StockLevelCounts>(() => {
    const counts: StockLevelCounts = { 'in-stock': 0, 'low-stock': 0, 'out-of-stock': 0 };
    for (const group of this.dashboard()?.stock.groups ?? []) {
      counts[this.stockLevel(group.availableQty)] += 1;
    }
    return counts;
  });
  readonly filteredStockGroups = computed(() => {
    const search = this.stockSearch().trim().toLocaleLowerCase();
    const sortBy = this.stockSortBy();
    const direction = this.stockSortDirection() === 'asc' ? 1 : -1;
    const order: Record<StockLevel, number> = {
      'in-stock': 0,
      'low-stock': 1,
      'out-of-stock': 2,
    };
    const groups = (this.dashboard()?.stock.groups ?? []).filter((group) => {
      if (!search) {
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
      ].some((value) => String(value).toLocaleLowerCase().includes(search));
    });

    return groups.sort((left, right) => {
      let comparison = this.compareStockGroups(left, right, sortBy, order);
      if (comparison === 0) {
        comparison =
          left.productName.localeCompare(right.productName) ||
          left.variantName.localeCompare(right.variantName);
      }
      return comparison * direction;
    });
  });

  ngOnInit() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const currentTime = new Date();
        this.now.set(currentTime);
      });
    this.loadDashboard();
  }

  onDateChange(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.value) {
      return;
    }

    if (input.value !== this.requestedDate()) {
      this.requestedDate.set(input.value);
      this.loadDashboard();
    }
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

  onStockSearch(event: Event) {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.stockSearch.set(input.value);
    }
  }

  onStockSortChange(event: Event) {
    const input = event.target;
    if (!(input instanceof HTMLSelectElement)) {
      return;
    }

    const field = STOCK_SORT_FIELDS.find((candidate) => candidate === input.value);
    if (field) {
      this.stockSortBy.set(field);
    }
  }

  toggleStockSortDirection() {
    this.stockSortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
  }

  private compareStockGroups(
    left: DashboardStockGroup,
    right: DashboardStockGroup,
    sortBy: StockSortField,
    order: Record<StockLevel, number>,
  ) {
    switch (sortBy) {
      case 'status':
        return (
          order[this.stockLevel(left.availableQty)] - order[this.stockLevel(right.availableQty)]
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

  loadDashboard() {
    const date = this.requestedDate();
    this.loading.set(true);
    this.dashboard.set(null);
    this.dashboardService.getDashboard(date).subscribe({
      next: (response) => {
        const result = response.result;
        if (
          !result?.sales ||
          !result.purchases ||
          !result.salesReturns ||
          !Array.isArray(result.stock?.groups) ||
          !result.stock?.totals
        ) {
          this.notification.error('The dashboard response did not include complete report data.');
          this.loading.set(false);
          return;
        }
        this.dashboard.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error("Couldn't load today's dashboard data.");
        this.loading.set(false);
      },
    });
  }

  downloadReports() {
    if (this.downloadingReports()) {
      return;
    }

    this.downloadingReports.set(true);
    this.dashboardService
      .downloadDashboard(this.requestedDate())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pdf) => {
          if (!pdf.size) {
            this.notification.error('The dashboard report PDF was empty.');
            this.downloadingReports.set(false);
            return;
          }

          const url = URL.createObjectURL(pdf);
          const link = document.createElement('a');
          link.href = url;
          link.download = `dashboard-report-${this.requestedDate()}.pdf`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url));
          this.notification.success('Dashboard report downloaded successfully.');
          this.downloadingReports.set(false);
        },
        error: () => {
          this.notification.error('Failed to download the dashboard report.');
          this.downloadingReports.set(false);
        },
      });
  }
}
