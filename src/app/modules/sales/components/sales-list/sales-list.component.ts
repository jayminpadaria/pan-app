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
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { ListFilter } from '../../../../shared/interfaces/list.interface';
import { Sales as Sale } from '../../../../shared/interfaces/sales.interface';
import { CustomersService } from '../../../../shared/services/customers.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SalesService } from '../../../../shared/services/sales.service';

const DEFAULT_SORT = { header: 'salesDate', direction: 'DESC' };

@Component({
  selector: 'app-sales-list',
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
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly customersService = inject(CustomersService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'orderNumber',
    'customer',
    'itemCount',
    'subTotal',
    'taxAmount',
    'grandTotal',
    'paymentStatus',
    'salesDate',
  ];
  readonly dataSource = new MatTableDataSource<Sale>([]);
  readonly search = new FormControl('', { nonNullable: true });
  readonly customers = signal<Customer[]>([]);
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
    this.loadCustomers();
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

  customerName(sale: Sale) {
    if (!sale.customerId) {
      return 'Walk-in';
    }
    const customer = this.customers().find((entry) => entry._id === sale.customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : sale.customerId;
  }

  load() {
    this.loading.set(true);
    this.salesService
      .getAll({
        filterList: this.buildFilterList(),
        sortHeader: this.sortHeader(),
        sortDirection: this.sortDirection(),
        page: this.page(),
        limit: this.limit(),
        isPagination: true,
      })
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.result?.documentItems ?? [];
          this.total.set(response.result?.totalDocument ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Failed to load sales.');
          this.loading.set(false);
        },
      });
  }

  private loadCustomers() {
    this.customersService
      .getAll({
        filterList: [],
        sortHeader: 'firstName',
        sortDirection: 'ASC',
        page: 1,
        limit: 1000,
        isPagination: false,
      })
      .subscribe({
        next: (response) => this.customers.set(response.result?.documentItems ?? []),
        error: () => this.notification.error('Failed to load customers.'),
      });
  }

  private buildFilterList(): ListFilter[] {
    return [
      {
        columnName: ['orderNumber', 'customerId', 'paymentStatus'],
        type: 'search',
        value: this.search.value.trim(),
      },
    ];
  }
}
