import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  SALES_RETURN_STATUS,
  Sales,
  SalesItem,
} from '../../../../shared/interfaces/sales.interface';
import {
  SalesReturn,
  SalesReturnPaymentMethod,
} from '../../../../shared/interfaces/sales-return.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SalesReturnService } from '../../../../shared/services/sales-return.service';
import { SalesService } from '../../../../shared/services/sales.service';

interface ReturnRowControls {
  selected: FormControl<boolean>;
  quantity: FormControl<number>;
  refundPricePerUnit: FormControl<number>;
  restockInventory: FormControl<boolean>;
  reason: FormControl<string>;
}

interface ReturnFormControls {
  salesReturnNumber: FormControl<string>;
  returnDate: FormControl<string>;
  paymentMethod: FormControl<SalesReturnPaymentMethod>;
  items: FormArray<FormGroup<ReturnRowControls>>;
}

interface ReturnRow {
  saleItem: SalesItem;
  previouslyReturnedQuantity: number;
  remainingQuantity: number;
  form: FormGroup<ReturnRowControls>;
}

const today = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-sales-returns',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressBarModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sales-returns.component.html',
})
export class SalesReturnsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly salesReturnService = inject(SalesReturnService);
  private readonly notification = inject(NotificationService);

  readonly sale = signal<Sales | null>(null);
  readonly returns = signal<SalesReturn[]>([]);
  readonly rows = signal<ReturnRow[]>([]);
  readonly returnReasons = [
    'Damaged',
    'Expired',
    'Wrong item',
    'Quality issue',
    'Customer changed mind',
    'Other',
  ];
  readonly returnStatuses = SALES_RETURN_STATUS;
  readonly loadingSale = signal(false);
  readonly loadingReturns = signal(false);
  readonly returnsLoadError = signal(false);
  readonly saving = signal(false);
  private saleId: string | null = null;

  readonly form: FormGroup<ReturnFormControls> = this.formBuilder.group({
    salesReturnNumber: this.formBuilder.control('', Validators.required),
    returnDate: this.formBuilder.control(today(), Validators.required),
    paymentMethod: this.formBuilder.control<SalesReturnPaymentMethod>(
      'CASH',
      Validators.required,
    ),
    items: this.formBuilder.array<FormGroup<ReturnRowControls>>([]),
  });

  get items(): FormArray<FormGroup<ReturnRowControls>> {
    return this.form.controls.items;
  }

  ngOnInit(): void {
    this.saleId = this.route.snapshot.paramMap.get('id');
    if (!this.saleId) {
      this.notification.error('Sales invoice not found.');
      this.router.navigate(['/app/sales']);
      return;
    }

    this.loadSale(this.saleId);
  }

  productName(item: SalesItem): string {
    return item.product?.name ?? item.productId;
  }

  variantName(item: SalesItem): string {
    return item.variant
      ? `${item.variant.sku} (${item.variant.weight} ${item.variant.unit})`
      : item.productVariantId;
  }

  refundTotal(): number {
    return this.rows().reduce((total, row) => {
      const value = row.form.getRawValue();
      return value.selected ? total + value.quantity * value.refundPricePerUnit : total;
    }, 0);
  }

  totalReturned(): number {
    const returnedAmount = this.sale()?.returnedAmount;
    if (returnedAmount !== undefined) return returnedAmount;
    return this.returns().reduce(
      (total, salesReturn) => total + salesReturn.totalRefundedToCustomer,
      0,
    );
  }

  hasReturnableItems(): boolean {
    return this.rows().some((row) => row.remainingQuantity > 0);
  }

  returnStatus(): SALES_RETURN_STATUS {
    const status = this.sale()?.salesReturnStatus;
    if (status === 'FULL') return SALES_RETURN_STATUS.FULLY_RETURNED;
    if (status) return status;
    if (!this.returns().length) return SALES_RETURN_STATUS.NONE;
    return this.hasReturnableItems()
      ? SALES_RETURN_STATUS.PARTIALLY_RETURNED
      : SALES_RETURN_STATUS.FULLY_RETURNED;
  }

  retryLoadingReturns(): void {
    const sale = this.sale();
    if (sale) this.loadReturns(sale);
  }

  saveReturn(): void {
    const sale = this.sale();
    if (!sale || this.returnsLoadError() || this.loadingReturns()) return;

    if (this.form.controls.salesReturnNumber.invalid || this.form.controls.returnDate.invalid) {
      this.form.controls.salesReturnNumber.markAsTouched();
      this.form.controls.returnDate.markAsTouched();
      return;
    }

    const selectedRows = this.rows().filter((row) => row.form.controls.selected.value);
    if (!selectedRows.length) {
      this.notification.error('Select at least one item to return.');
      return;
    }

    for (const row of selectedRows) {
      row.form.markAllAsTouched();
      const quantity = row.form.controls.quantity.value;
      if (
        row.form.controls.quantity.invalid ||
        quantity > row.remainingQuantity ||
        row.form.controls.refundPricePerUnit.invalid ||
        !row.form.controls.reason.value.trim()
      ) {
        this.notification.error('Enter a valid quantity, refund amount, and return reason.');
        return;
      }
    }

    const value = this.form.getRawValue();
    const items = selectedRows.map((row) => {
      const item = row.form.getRawValue();
      return {
        productVariantId: row.saleItem.productVariantId,
        productStockId: row.saleItem.productStockId,
        quantity: item.quantity,
        refundPricePerUnit: item.refundPricePerUnit,
        restockInventory: item.restockInventory,
        reason: item.reason.trim(),
      };
    });
    const totalRefundedToCustomer = Number(
      items
        .reduce((total, item) => total + item.quantity * item.refundPricePerUnit, 0)
        .toFixed(2),
    );

    this.saving.set(true);
    this.salesReturnService
      .create({
        salesReturnNumber: value.salesReturnNumber.trim(),
        salesId: sale._id,
        items,
        totalRefundedToCustomer,
        paymentMethod: value.paymentMethod,
        returnDate: new Date(`${value.returnDate}T00:00:00.000Z`),
      })
      .subscribe({
        next: () => {
          this.notification.success('Sales return created successfully.');
          this.saving.set(false);
          this.form.controls.salesReturnNumber.setValue(this.createReturnNumber(sale));
          this.loadReturns(sale);
        },
        error: () => {
          this.notification.error('Failed to create sales return.');
          this.saving.set(false);
        },
      });
  }

  private loadSale(id: string): void {
    this.loadingSale.set(true);
    this.salesService.getById(id).subscribe({
      next: (response) => {
        const sale = response.result;
        if (!sale) {
          this.notification.error('Sales invoice not found.');
          this.router.navigate(['/app/sales']);
          return;
        }

        this.sale.set(sale);
        this.form.controls.salesReturnNumber.setValue(this.createReturnNumber(sale));
        this.form.controls.paymentMethod.setValue(sale.paymentMethod ?? 'CASH');
        this.loadingSale.set(false);
        this.setSaleReturns(sale);
      },
      error: () => {
        this.notification.error('Failed to load sales invoice.');
        this.loadingSale.set(false);
        this.router.navigate(['/app/sales']);
      },
    });
  }

  private loadReturns(sale: Sales): void {
    this.loadingReturns.set(true);
    this.returnsLoadError.set(false);
    this.salesService.getById(sale._id).subscribe({
      next: (response) => {
        const refreshedSale = response.result;
        if (!refreshedSale || !Array.isArray(refreshedSale.salesReturns)) {
          this.returnsLoadError.set(true);
          this.loadingReturns.set(false);
          this.notification.error('The sales invoice response did not include its return history.');
          return;
        }

        this.sale.set(refreshedSale);
        this.setSaleReturns(refreshedSale);
        this.loadingReturns.set(false);
      },
      error: () => {
        this.returnsLoadError.set(true);
        this.loadingReturns.set(false);
        this.notification.error('Failed to refresh return history for this invoice.');
      },
    });
  }

  private setSaleReturns(sale: Sales): void {
    if (!Array.isArray(sale.salesReturns)) {
      this.returns.set([]);
      this.rows.set([]);
      this.items.clear();
      this.returnsLoadError.set(true);
      this.notification.error('The sales invoice response did not include its return history.');
      return;
    }

    const returns = sale.salesReturns;
    this.returns.set(returns);
    this.populateRows(sale, returns);
    this.returnsLoadError.set(false);
  }

  private populateRows(sale: Sales, returns: SalesReturn[]): void {
    this.items.clear();
    const returnedQuantities = new Map<string, number>();
    for (const salesReturn of returns) {
      for (const item of salesReturn.items) {
        const key = this.stockKey(item.productVariantId, item.productStockId);
        returnedQuantities.set(key, (returnedQuantities.get(key) ?? 0) + item.quantity);
      }
    }

    const returnedQuantityByStock = new Map(returnedQuantities);

    const rows = sale.items.map((saleItem) => {
      const key = this.stockKey(saleItem.productVariantId, saleItem.productStockId);
      const returnedForStock = returnedQuantityByStock.get(key) ?? 0;
      const previouslyReturnedQuantity = Math.min(saleItem.quantity, returnedForStock);
      returnedQuantityByStock.set(
        key,
        Math.max(0, returnedForStock - previouslyReturnedQuantity),
      );
      const remainingQuantity = saleItem.quantity - previouslyReturnedQuantity;

      const refundPricePerUnit =
        saleItem.quantity > 0
          ? Math.max(0, saleItem.soldPrice - saleItem.discountAmount / saleItem.quantity)
          : 0;
      const rowForm = this.formBuilder.group({
        selected: this.formBuilder.control(false),
        quantity: this.formBuilder.control(1, [Validators.required, Validators.min(1)]),
        refundPricePerUnit: this.formBuilder.control(refundPricePerUnit, [
          Validators.required,
          Validators.min(0),
        ]),
        restockInventory: this.formBuilder.control(true),
        reason: this.formBuilder.control(''),
      });
      this.items.push(rowForm);
      return {
        saleItem,
        previouslyReturnedQuantity,
        remainingQuantity,
        form: rowForm,
      };
    });

    this.rows.set(rows);
  }

  private createReturnNumber(sale: Sales): string {
    const invoiceReference = (sale.orderNumber ?? sale._id).replace(/[^a-zA-Z0-9-]/g, '').slice(-24);
    return `SR-${invoiceReference}-${Date.now()}`;
  }

  private stockKey(variantId: string, stockId: string): string {
    return `${variantId}:${stockId}`;
  }
}
