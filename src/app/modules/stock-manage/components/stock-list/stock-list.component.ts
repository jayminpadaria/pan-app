import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { debounceTime } from 'rxjs';
import {
  ProductStockListItem,
  ProductStockListTotals,
} from '../../../../shared/interfaces/product-stock.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import {
  StockConditionDialogComponent,
  StockConditionInput,
} from './stock-condition-dialog.component';

const EMPTY_TOTALS: ProductStockListTotals = {
  availableQty: 0,
  damagedQty: 0,
  expiredQty: 0,
  obsoleteQty: 0,
  onHandQty: 0,
};

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
})
export class StockListComponent implements OnInit, AfterViewInit {
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) private paginator!: MatPaginator;
  @ViewChild(MatSort) private sort!: MatSort;

  readonly displayedColumns = [
    'productName',
    'variantName',
    'sku',
    'availableQty',
    'onHandQty',
    'damagedQty',
    'expiredQty',
    'obsoleteQty',
    'costPrice',
    'retailPrice',
    'receivedAt',
    'expiryDate',
    'actions',
  ];
  readonly dataSource = new MatTableDataSource<ProductStockListItem>([]);
  readonly search = new FormControl('', { nonNullable: true });
  readonly loading = signal(false);
  readonly updatingStockId = signal<string | null>(null);
  readonly total = signal(0);
  readonly totals = signal<ProductStockListTotals>(EMPTY_TOTALS);

  constructor() {
    this.dataSource.filterPredicate = (item, filter) =>
      [
        item.productName,
        item.variantName,
        item.sku,
        item.barcode,
        item.availableQty,
        item.onHandQty,
        item.damagedQty,
        item.expiredQty,
        item.obsoleteQty,
        item.costPrice,
        item.retailPrice,
        item.receivedAt,
        item.expiryDate ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(filter);

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'productName':
          return item.productName;
        case 'variantName':
          return item.variantName;
        case 'sku':
          return item.sku;
        case 'availableQty':
          return item.availableQty;
        case 'onHandQty':
          return item.onHandQty;
        case 'damagedQty':
          return item.damagedQty;
        case 'expiredQty':
          return item.expiredQty;
        case 'obsoleteQty':
          return item.obsoleteQty;
        case 'costPrice':
          return item.costPrice;
        case 'retailPrice':
          return item.retailPrice;
        case 'receivedAt':
          return new Date(item.receivedAt).getTime();
        case 'expiryDate':
          return item.expiryDate ? new Date(item.expiryDate).getTime() : 0;
        default:
          return '';
      }
    };
  }

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.dataSource.filter = value.trim().toLocaleLowerCase();
        this.paginator?.firstPage();
      });
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  get hasSearch(): boolean {
    return !!this.search.value.trim();
  }

  clearSearch(): void {
    this.search.setValue('');
  }

  load(): void {
    if (this.loading() || this.updatingStockId() !== null) {
      return;
    }

    this.loading.set(true);
    this.productsService.getStockList().subscribe({
      next: (response) => {
        const result = response.result;
        if (
          !result ||
          !Array.isArray(result.documentItems) ||
          !result.totals ||
          typeof result.totalDocument !== 'number'
        ) {
          this.notification.error('The stock list response did not include complete stock data.');
          this.loading.set(false);
          return;
        }

        this.dataSource.data = result.documentItems;
        this.total.set(result.totalDocument);
        this.totals.set(result.totals);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load stock.');
        this.loading.set(false);
      },
    });
  }

  updateCondition(item: ProductStockListItem): void {
    if (
      this.loading() ||
      this.updatingStockId() !== null ||
      item.availableQty < 1
    ) {
      return;
    }

    this.updatingStockId.set(item.stockId);
    this.dialog
      .open(StockConditionDialogComponent, {
        width: '420px',
        maxWidth: '95vw',
        data: {
          productName: item.productName,
          variantName: item.variantName,
          availableQty: item.availableQty,
        },
      })
      .afterClosed()
      .subscribe((input?: StockConditionInput) => {
        if (!input) {
          this.updatingStockId.set(null);
          return;
        }

        this.productsService
          .updateStockCondition(item.stockId, input.condition, input.quantity)
          .subscribe({
            next: () => {
              this.notification.success('Stock condition updated successfully.');
              this.updatingStockId.set(null);
              this.load();
            },
            error: () => {
              this.notification.error('Failed to update stock condition.');
              this.updatingStockId.set(null);
            },
          });
      });
  }
}
