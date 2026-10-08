import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { debounceTime } from 'rxjs';
import { ListFilter } from '../../../../shared/interfaces/list.interface';
import { Purchase } from '../../../../shared/interfaces/purchase.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PurchasesService } from '../../../../shared/services/purchases.service';

const DEFAULT_SORT = { header: 'transactionDate', direction: 'DESC' };

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './purchase-list.component.html',
  styleUrl: './purchase-list.component.scss',
})
export class PurchaseListComponent implements OnInit {
  private readonly purchasesService = inject(PurchasesService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'invoiceNumber',
    'sourceType',
    'supplierId',
    'totalCostAmount',
    'status',
    'transactionDate',
    'actions',
  ];
  readonly dataSource = new MatTableDataSource<Purchase>([]);
  readonly search = new FormControl('', { nonNullable: true });
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly loading = signal(false);
  readonly sortHeader = signal(DEFAULT_SORT.header);
  readonly sortDirection = signal(DEFAULT_SORT.direction);

  ngOnInit() {
    this.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.load();
  }

  get hasSearch() {
    return !!this.search.value.trim();
  }

  clearSearch() {
    this.search.setValue('');
  }

  onPage(event: PageEvent) {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  onSort(sort: Sort) {
    this.sortHeader.set(sort.direction ? sort.active : DEFAULT_SORT.header);
    this.sortDirection.set(sort.direction ? sort.direction.toUpperCase() : DEFAULT_SORT.direction);
    this.page.set(1);
    this.load();
  }

  transactionDate(purchase: Purchase) {
    return new Date(purchase.transactionDate).toLocaleDateString();
  }

  load() {
    this.loading.set(true);
    this.purchasesService
      .getAll({
        filterList: this.buildFilterList(),
        sortHeader: this.sortHeader(),
        sortDirection: this.sortDirection(),
        page: this.page(),
        limit: this.limit(),
        isPagination: true,
      })
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.result?.documentItems ?? [];
          this.total.set(res.result?.totalDocument ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Failed to load purchases.');
          this.loading.set(false);
        },
      });
  }

  private buildFilterList(): ListFilter[] {
    return [
      {
        columnName: ['invoiceNumber', 'sourceType', 'supplierId', 'status'],
        type: 'search',
        value: this.search.value.trim(),
      },
    ];
  }
}
