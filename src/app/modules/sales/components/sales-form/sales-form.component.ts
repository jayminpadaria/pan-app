import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { ProductStock } from '../../../../shared/interfaces/product-stock.interface';
import { Product } from '../../../../shared/interfaces/product.interface';
import { Sales, SalesItem } from '../../../../shared/interfaces/sales.interface';
import { CustomersService } from '../../../../shared/services/customers.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductStocksService } from '../../../../shared/services/product-stocks.service';
import { ProductsService } from '../../../../shared/services/products.service';
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
  private readonly stockService = inject(ProductStocksService);
  private readonly productsService = inject(ProductsService);
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
    paymentStatus: ['PENDING', Validators.required],
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
    this.stockService.getByBarcode(barcode).subscribe({
      next: (response) => {
        const stock = response.result;
        if (!stock) {
          this.notification.error('No stock batch was found for this barcode.');
          this.finishScan();
          return;
        }
        if (
          !stock.isActive ||
          stock.isDeleted ||
          stock.isDeadStock ||
          stock.availableQty < 1
        ) {
          this.notification.error('This item has no saleable stock available.');
          this.finishScan();
          return;
        }

        this.productsService.getById(stock.productId).subscribe({
          next: (productResponse) => {
            const product = productResponse.result;
            const variant = product?.variants?.find(
              (candidate) => candidate.barcode?.trim() === barcode,
            );
            if (!product || !variant?._id) {
              this.notification.error('The barcode could not be matched to a product variant.');
              this.finishScan();
              return;
            }

            this.addStockedVariant(stock, product, variant);
            this.finishScan();
          },
          error: () => {
            this.notification.error('Failed to load the product for this barcode.');
            this.finishScan();
          },
        });
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
      salesDate: new Date(`${value.salesDate}T00:00:00`),
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

  private addStockedVariant(stock: ProductStock, product: Product, variant: NonNullable<Product['variants']>[number]) {
    const existingItem = this.items.controls.find(
      (item) => item.controls.productStockId.value === stock._id,
    );
    if (existingItem) {
      const nextQuantity = existingItem.controls.quantity.value + 1;
      if (nextQuantity > stock.availableQty) {
        this.notification.error('The available quantity for this stock batch has been reached.');
        return;
      }
      existingItem.controls.quantity.setValue(nextQuantity);
      existingItem.controls.quantity.markAsDirty();
      return;
    }

    const item = this.formBuilder.group(
      {
        productId: [stock.productId],
        productVariantId: [variant._id ?? ''],
        productStockId: [stock._id],
        productName: [`${product.name} — ${variant.sku}`],
        batchNumber: [stock.batchNumber],
        availableQty: [stock.availableQty],
        quantity: [1, [Validators.required, Validators.min(1), Validators.max(stock.availableQty)]],
        costPriceAtSale: [stock.costPrice],
        soldPrice: [stock.retailPrice, [Validators.required, Validators.min(0)]],
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
