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
import { Product } from '../../../../shared/interfaces/product.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';

const DEFAULT_SORT = { header: 'name', direction: 'ASC' };

@Component({
  selector: 'app-product-list',
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
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['name', 'brand', 'categories', 'actions'];
  readonly dataSource = new MatTableDataSource<Product>([]);
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

  categories(product: Product) {
    return product.categoriesName?.join(', ') || '—';
  }

  load() {
    this.loading.set(true);
    this.productsService
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
          this.notification.error('Failed to load products.');
          this.loading.set(false);
        },
      });
  }

  private buildFilterList(): ListFilter[] {
    return [
      {
        columnName: ['name', 'sku', 'brand', 'description', 'categories'],
        type: 'search',
        value: this.search.value.trim(),
      },
    ];
  }
}
