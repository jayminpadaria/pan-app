import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { StockLookupResponse } from '../../../../shared/interfaces/product-stock.interface';
import { Sales, SalesItem } from '../../../../shared/interfaces/sales.interface';
import { CustomersService } from '../../../../shared/services/customers.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SalesService } from '../../../../shared/services/sales.service';

interface SalesItemControls {
  productId: FormControl<string>;
  productVariantId: FormControl<string>;
  productStockId: FormControl<string>;
  productName: FormControl<string>;
  batchNumber: FormControl<string>;
  availableQty: FormControl<number>;
  quantity: FormControl<number>;
  costPriceAtSale: FormControl<number>;
  soldPrice: FormControl<number>;
  discountAmount: FormControl<number>;
}

const today = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const validLineDiscount: ValidatorFn = (control) => {
  const quantity = Number(control.get('quantity')?.value);
  const soldPrice = Number(control.get('soldPrice')?.value);
  const discountAmount = Number(control.get('discountAmount')?.value);
  return discountAmount <= quantity * soldPrice ? null : { discountExceedsLineTotal: true };
};

@Component({
  selector: 'app-sales-form',
  standalone: false,
  templateUrl: './sales-form.component.html',
  styleUrl: './sales-form.component.scss',
})
export class SalesFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly salesService = inject(SalesService);
  private readonly customersService = inject(CustomersService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  @ViewChild('barcodeInput') private barcodeInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly scanning = signal(false);
  readonly loadingCustomers = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly barcode = new FormControl('', { nonNullable: true });

  readonly form = this.formBuilder.group({
    orderNumber: ['', Validators.required],
    customerId: [''],
    salesDate: [today(), Validators.required],
    paymentStatus: ['UNPAID', Validators.required],
    taxAmount: [0, [Validators.required, Validators.min(0)]],
    items: this.formBuilder.array<FormGroup<SalesItemControls>>([], Validators.minLength(1)),
  });

  get items() {
    return this.form.controls.items;
  }

  ngOnInit() {
    this.form.controls.orderNumber.setValue(this.generateOrderNumber());
    this.loadCustomers();
  }

  scanBarcode(event?: Event) {
    event?.preventDefault();
    const barcode = this.barcode.value.trim();
    if (this.scanning() || !barcode) {
      return;
    }

    this.scanning.set(true);
    this.salesService.stock(barcode).subscribe({
      next: (response) => {
        const lookup = response.result;
        if (!lookup?.product?._id || !lookup.variant?._id || !lookup.stock) {
          this.notification.error('The barcode lookup returned incomplete product or stock details.');
          this.finishScan();
          return;
        }
        if (!lookup.variant.isActive || lookup.variant.isDeleted) {
          this.notification.error('This product variant is inactive.');
          this.finishScan();
          return;
        }
        if (lookup.stock.totalAvailableQty < 1) {
          this.notification.error('This item has no saleable stock available.');
          this.finishScan();
          return;
        }
        this.addStockedVariant(lookup);
        this.finishScan();
      },
      error: () => {
        this.notification.error('Failed to look up stock for this barcode.');
        this.finishScan();
      },
    });
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  itemInvalid(item: FormGroup<SalesItemControls>, name: keyof SalesItemControls) {
    const control = item.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  discountInvalid(item: FormGroup<SalesItemControls>) {
    return (
      item.hasError('discountExceedsLineTotal') &&
      (item.controls.discountAmount.dirty || item.controls.discountAmount.touched)
    );
  }

  lineTotal(item: FormGroup<SalesItemControls>) {
    const controls = item.controls;
    return Math.max(
      0,
      controls.quantity.value * controls.soldPrice.value - controls.discountAmount.value,
    );
  }

  subTotal() {
    return this.items.controls.reduce((total, item) => total + this.lineTotal(item), 0);
  }

  grandTotal() {
    return this.subTotal() + this.form.controls.taxAmount.value;
  }

  isInvalid(name: 'orderNumber' | 'salesDate' | 'paymentStatus' | 'taxAmount') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  saveSale() {
    if (this.form.invalid || this.scanning()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const sale: Omit<Sales, '_id'> = {
      orderNumber: value.orderNumber.trim(),
      customerId: value.customerId || null,
      items: value.items.map((item): SalesItem => ({
        productId: item.productId,
        productVariantId: item.productVariantId,
        productStockId: item.productStockId,
        quantity: item.quantity,
        costPriceAtSale: item.costPriceAtSale,
        soldPrice: item.soldPrice,
        discountAmount: item.discountAmount,
      })),
      subTotal: this.subTotal(),
      taxAmount: value.taxAmount,
      grandTotal: this.grandTotal(),
      paymentStatus: value.paymentStatus,
      salesDate: new Date(`${value.salesDate}T00:00:00.000Z`),
    };

    this.saving.set(true);
    this.salesService.create(sale).subscribe({
      next: () => {
        this.notification.success('Sale created successfully.');
        this.router.navigate(['/app/sales']);
      },
      error: () => {
        this.notification.error('Failed to create sale.');
        this.saving.set(false);
      },
    });
  }

  private addStockedVariant(lookup: StockLookupResponse) {
    const { product, variant } = lookup;
    const batches = lookup.stock.batches
      .filter(
        (batch) =>
          batch.isActive &&
          !batch.isDeleted &&
          !batch.isDeadStock &&
          batch.availableQty > 0,
      )
      .sort(
        (left, right) =>
          new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime(),
      );
    const batch = batches.find((candidate) => {
      const existing = this.items.controls.find(
        (item) => item.controls.productStockId.value === candidate._id,
      );
      return !existing || existing.controls.quantity.value < candidate.availableQty;
    });
    if (!batch) {
      this.notification.error('No available stock batch was found for this barcode.');
      return;
    }

    const existingItem = this.items.controls.find(
      (item) => item.controls.productStockId.value === batch._id,
    );
    if (existingItem) {
      const nextQuantity = existingItem.controls.quantity.value + 1;
      existingItem.controls.quantity.setValue(nextQuantity);
      existingItem.controls.quantity.markAsDirty();
      return;
    }

    const item = this.formBuilder.group(
      {
        productId: [product._id],
        productVariantId: [variant._id],
        productStockId: [batch._id],
        productName: [`${product.name} — ${variant.sku}`],
        batchNumber: [batch.batchNumber],
        availableQty: [batch.availableQty],
        quantity: [1, [Validators.required, Validators.min(1), Validators.max(batch.availableQty)]],
        costPriceAtSale: [batch.costPrice],
        soldPrice: [batch.retailPrice, [Validators.required, Validators.min(0)]],
        discountAmount: [0, [Validators.required, Validators.min(0)]],
      },
      { validators: validLineDiscount },
    );
    this.items.push(item);
  }

  private finishScan() {
    this.scanning.set(false);
    this.barcode.setValue('');
    this.barcodeInput?.nativeElement.focus();
  }

  private loadCustomers() {
    this.loadingCustomers.set(true);
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
        next: (response) => {
          this.customers.set(response.result?.documentItems ?? []);
          this.loadingCustomers.set(false);
        },
        error: () => {
          this.notification.error('Failed to load customers.');
          this.loadingCustomers.set(false);
        },
      });
  }

  private generateOrderNumber() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `SAL-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(
      now.getHours(),
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }
}
