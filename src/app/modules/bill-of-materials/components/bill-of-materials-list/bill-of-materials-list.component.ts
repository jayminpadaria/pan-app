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
import { BillOfMaterials } from '../../../../shared/interfaces/bill-of-materials.interface';
import { ListFilter } from '../../../../shared/interfaces/list.interface';
import { Product } from '../../../../shared/interfaces/product.interface';
import { ProductsService } from '../../../../shared/services/products.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { BillOfMaterialsService } from '../../../../shared/services/bill-of-materials.service';

const DEFAULT_SORT = { header: 'productVariantId', direction: 'ASC' };

@Component({
  selector: 'app-bill-of-materials-list',
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
  templateUrl: './bill-of-materials-list.component.html',
  styleUrl: './bill-of-materials-list.component.scss',
})
export class BillOfMaterialsListComponent implements OnInit {
  private readonly billOfMaterialsService = inject(BillOfMaterialsService);
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['product', 'variant', 'output', 'components', 'status', 'actions'];
  readonly dataSource = new MatTableDataSource<BillOfMaterials>([]);
  readonly search = new FormControl('', { nonNullable: true });
  readonly products = signal<Product[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly loading = signal(false);
  readonly sortHeader = signal(DEFAULT_SORT.header);
  readonly sortDirection = signal(DEFAULT_SORT.direction);

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.load();
    this.loadProducts();
  }

  get hasSearch(): boolean {
    return !!this.search.value.trim();
  }

  clearSearch(): void {
    this.search.setValue('');
  }

  onSort(sort: Sort): void {
    this.sortHeader.set(sort.direction ? sort.active : DEFAULT_SORT.header);
    this.sortDirection.set(sort.direction ? sort.direction.toUpperCase() : DEFAULT_SORT.direction);
    this.page.set(1);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  productName(bom: BillOfMaterials): string {
    return this.products().find((product) => product._id === bom.productId)?.name ?? bom.productId;
  }

  variantName(bom: BillOfMaterials): string {
    const variant = this.products()
      .find((product) => product._id === bom.productId)
      ?.variants?.find((item) => item._id === bom.productVariantId);
    return variant ? `${variant.sku} (${variant.weight} ${variant.unit})` : bom.productVariantId;
  }

  load(): void {
    this.loading.set(true);
    this.billOfMaterialsService
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
          this.notification.error('Failed to load bills of materials.');
          this.loading.set(false);
        },
      });
  }

  private loadProducts(): void {
    this.productsService
      .getAll({
        filterList: [],
        sortHeader: 'name',
        sortDirection: 'ASC',
        page: 1,
        limit: 500,
        isPagination: true,
      })
      .subscribe({
        next: (response) => this.products.set(response.result?.documentItems ?? []),
        error: () => this.notification.error('Could not load product names for bills of materials.'),
      });
  }

  private buildFilterList(): ListFilter[] {
    return [
      {
        columnName: ['productId', 'productVariantId'],
        type: 'search',
        value: this.search.value.trim(),
      },
    ];
  }
}
