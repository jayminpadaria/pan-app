import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  Subscription,
  switchMap,
} from 'rxjs';
import {
  Purchase,
  PurchaseItem,
  SOURCE_TYPE,
} from '../../../../shared/interfaces/purchase.interface';
import { Product } from '../../../../shared/interfaces/product.interface';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { PurchasesService } from '../../../../shared/services/purchases.service';
import { SuppliersService } from '../../../../shared/services/suppliers.service';

interface PurchaseItemControls {
  _id: FormControl<string>;
  productId: FormControl<string>;
  productVariantId: FormControl<string>;
  productSearch: FormControl<string>;
  batchNumber: FormControl<string>;
  quantity: FormControl<number>;
  costPrice: FormControl<number>;
  retailPrice: FormControl<number>;
  expiryDate: FormControl<string>;
}

const today = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const retailPriceGreaterThanCost: ValidatorFn = (control) => {
  const costValue = control.get('costPrice')?.value;
  const retailValue = control.get('retailPrice')?.value;
  if (costValue === null || costValue === '' || retailValue === null || retailValue === '') {
    return null;
  }

  const costPrice = Number(costValue);
  const retailPrice = Number(retailValue);
  return Number.isFinite(costPrice) && Number.isFinite(retailPrice) && retailPrice > costPrice
    ? null
    : { retailPriceMustExceedCost: true };
};

@Component({
  selector: 'app-purchase-form',
  standalone: false,
  templateUrl: './purchase-form.component.html',
})
export class PurchaseFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly productsService = inject(ProductsService);
  private readonly purchasesService = inject(PurchasesService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly loadingPurchase = signal(false);
  readonly loadingSuppliers = signal(false);
  readonly isEdit = signal(false);
  readonly sourceTypes = SOURCE_TYPE;
  readonly availableSuppliers = signal<Supplier[]>([]);
  readonly supplierSearch = new FormControl('', { nonNullable: true });
  private purchaseId: string | null = null;
  private readonly productSearchOptions = new WeakMap<
    FormGroup<PurchaseItemControls>,
    WritableSignal<Product[]>
  >();
  private readonly productSearchLoading = new WeakMap<
    FormGroup<PurchaseItemControls>,
    Signal<boolean>
  >();
  private readonly selectedProductLabels = new WeakMap<FormGroup<PurchaseItemControls>, string>();
  private readonly productSearchSubscriptions = new WeakMap<
    FormGroup<PurchaseItemControls>,
    Subscription
  >();

  readonly form = this.formBuilder.group({
    invoiceNumber: ['', Validators.required],
    sourceType: this.formBuilder.control<SOURCE_TYPE | ''>(
      SOURCE_TYPE.INTERNAL_PRODUCTION,
      Validators.required,
    ),
    supplierId: [''],
    status: ['PENDING', Validators.required],
    transactionDate: [today(), Validators.required],
    items: this.formBuilder.array<FormGroup<PurchaseItemControls>>([], Validators.minLength(1)),
  });

  get items() {
    return this.form.controls.items;
  }

  get selectedSupplierId() {
    return this.form.controls.supplierId.value;
  }

  isInternalProduction() {
    return this.form.controls.sourceType.value === SOURCE_TYPE.INTERNAL_PRODUCTION;
  }

  isCompleted() {
    return this.form.controls.status.value.toUpperCase() === 'COMPLETED';
  }

  supplierLabel(supplierId: string) {
    return (
      this.availableSuppliers().find((supplier) => supplier._id === supplierId)?.companyName ??
      supplierId
    );
  }

  filteredSuppliers() {
    const search = this.supplierSearch.value.trim().toLocaleLowerCase();
    return this.availableSuppliers().filter(
      (supplier) =>
        supplier._id !== this.selectedSupplierId &&
        `${supplier.companyName} ${supplier.contactName} ${supplier.email}`
          .toLocaleLowerCase()
          .includes(search),
    );
  }

  selectSupplier(event: MatAutocompleteSelectedEvent) {
    const supplierId = event.option.value as string;
    this.form.controls.supplierId.setValue(supplierId);
    this.supplierSearch.setValue(this.supplierLabel(supplierId));
  }

  onSupplierInput() {
    const supplierId = this.selectedSupplierId;
    if (supplierId && this.supplierSearch.value !== this.supplierLabel(supplierId)) {
      this.form.controls.supplierId.setValue('');
    }
  }

  ngOnInit() {
    this.loadSuppliers();
    this.form.controls.sourceType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sourceType) => {
        if (sourceType === SOURCE_TYPE.INTERNAL_PRODUCTION) {
          this.form.controls.invoiceNumber.setValue(this.generateInvoiceNumber());
        }
      });

    this.purchaseId = this.route.snapshot.paramMap.get('id');
    if (!this.purchaseId) {
      this.form.controls.invoiceNumber.setValue(this.generateInvoiceNumber());
      this.addItem();
      return;
    }

    this.isEdit.set(true);
    this.loadingPurchase.set(true);
    this.purchasesService.getById(this.purchaseId).subscribe({
      next: (response) => {
        if (!response.result) {
          this.notification.error('Purchase not found.');
          this.router.navigate(['/app/purchases']);
          return;
        }

        if (response.result.status.trim().toUpperCase() === 'COMPLETED') {
          this.loadingPurchase.set(false);
          this.router.navigate(['/app/purchases']);
          return;
        }

        this.patchPurchase(response.result);
        this.loadingPurchase.set(false);
      },
      error: () => {
        this.notification.error('Failed to load purchase.');
        this.router.navigate(['/app/purchases']);
      },
    });
  }

  addItem(item?: PurchaseItem) {
    const itemForm = this.formBuilder.group(
      {
        _id: [item?._id ?? ''],
        productId: [item?.productId ?? '', Validators.required],
        productVariantId: [item?.productVariantId ?? '', Validators.required],
        productSearch: [item?.productId ?? ''],
        batchNumber: [
          item?.batchNumber ?? this.batchNumberFor(this.form.controls.transactionDate.value),
          [Validators.required, Validators.pattern(/^B-\d{6}$/)],
        ],
        quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
        costPrice: [item?.costPrice ?? 0, [Validators.required, Validators.min(0)]],
        retailPrice: [item?.retailPrice ?? 0, [Validators.required, Validators.min(0)]],
        expiryDate: [this.dateInput(item?.expiryDate)],
      },
      { validators: retailPriceGreaterThanCost },
    );
    this.items.push(itemForm);
    if (item?.productId && item.productVariantId) {
      this.selectedProductLabels.set(itemForm, item.productId);
    }
    this.connectProductSearch(itemForm);
    if (item?.productId && item.productVariantId) {
      this.loadSelectedProduct(itemForm, item.productId, item.productVariantId);
    }
  }

  removeItem(index: number) {
    const item = this.items.at(index);
    this.productSearchSubscriptions.get(item)?.unsubscribe();
    this.productSearchSubscriptions.delete(item);
    this.items.removeAt(index);
  }

  productOptionsFor(item: FormGroup<PurchaseItemControls>) {
    return this.productSearchOptions.get(item)?.() ?? [];
  }

  productSearchIsLoading(item: FormGroup<PurchaseItemControls>) {
    return this.productSearchLoading.get(item)?.() ?? false;
  }

  selectProductVariant(item: FormGroup<PurchaseItemControls>, event: MatAutocompleteSelectedEvent) {
    const variantId = event.option.value as string;
    const product = this.productOptionsFor(item).find((option) =>
      option.variants?.some((variant) => variant._id === variantId),
    );
    const variant = product?.variants?.find((option) => option._id === variantId);
    if (!product || !variant?._id) {
      this.notification.error('The selected product variant could not be found.');
      return;
    }

    const label = `${product.name} — ${variant.sku}`;
    item.controls.productId.setValue(product._id);
    item.controls.productVariantId.setValue(variant._id);
    item.controls.productSearch.setValue(label, { emitEvent: false });
    this.selectedProductLabels.set(item, label);
  }

  onProductSearchInput(item: FormGroup<PurchaseItemControls>) {
    const selectedLabel = this.selectedProductLabels.get(item);
    if (selectedLabel && item.controls.productSearch.value !== selectedLabel) {
      item.controls.productId.setValue('');
      item.controls.productVariantId.setValue('');
      this.selectedProductLabels.delete(item);
    }
  }

  touchProductSelection(item: FormGroup<PurchaseItemControls>) {
    item.controls.productId.markAsTouched();
    item.controls.productVariantId.markAsTouched();
  }

  productSelectionInvalid(item: FormGroup<PurchaseItemControls>) {
    const hasTouchedId = item.controls.productId.touched || item.controls.productVariantId.touched;
    return (
      hasTouchedId && (item.controls.productId.invalid || item.controls.productVariantId.invalid)
    );
  }

  itemInvalid(item: FormGroup<PurchaseItemControls>, name: keyof PurchaseItemControls) {
    const control = item.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  retailPriceMustExceedCost(item: FormGroup<PurchaseItemControls>) {
    return (
      item.hasError('retailPriceMustExceedCost') &&
      (item.controls.costPrice.dirty ||
        item.controls.costPrice.touched ||
        item.controls.retailPrice.dirty ||
        item.controls.retailPrice.touched)
    );
  }

  lineTotal(item: FormGroup<PurchaseItemControls>) {
    return item.controls.quantity.value * item.controls.costPrice.value;
  }

  totalCostAmount() {
    return this.items.controls.reduce((total, item) => total + this.lineTotal(item), 0);
  }

  isInvalid(name: 'invoiceNumber' | 'sourceType' | 'supplierId' | 'status' | 'transactionDate') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  savePurchase() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (!value.sourceType) {
      return;
    }
    const purchase: Omit<Purchase, '_id'> = {
      invoiceNumber: value.invoiceNumber.trim(),
      sourceType: value.sourceType,
      supplierId: value.supplierId.trim() || null,
      status: value.status.trim(),
      transactionDate: new Date(`${value.transactionDate}T00:00:00.000Z`),
      totalCostAmount: this.totalCostAmount(),
      items: value.items.map((item) => ({
        ...(item._id.trim() ? { _id: item._id.trim() } : {}),
        productId: item.productId.trim(),
        productVariantId: item.productVariantId.trim(),
        batchNumber: item.batchNumber.trim(),
        quantity: item.quantity,
        costPrice: item.costPrice,
        retailPrice: item.retailPrice,
        expiryDate: item.expiryDate ? new Date(`${item.expiryDate}T00:00:00.000Z`) : null,
      })),
    };
    const request =
      this.isEdit() && this.purchaseId
        ? this.purchasesService.update(this.purchaseId, purchase)
        : this.purchasesService.create(purchase);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'Purchase updated successfully.' : 'Purchase created successfully.',
        );
        this.router.navigate(['/app/purchases']);
      },
      error: () => {
        this.notification.error(
          this.isEdit() ? 'Failed to update purchase.' : 'Failed to create purchase.',
        );
        this.saving.set(false);
      },
    });
  }

  private patchPurchase(purchase: Purchase) {
    this.form.patchValue(
      {
        invoiceNumber: purchase.invoiceNumber,
        sourceType: purchase.sourceType,
        supplierId: purchase.supplierId ?? '',
        status: purchase.status,
        transactionDate: this.dateInput(purchase.transactionDate),
      },
      { emitEvent: false },
    );
    if (purchase.supplierId) {
      this.supplierSearch.setValue(this.supplierLabel(purchase.supplierId));
    }
    this.items.clear();
    purchase.items?.forEach((item) => this.addItem(item));
  }

  private connectProductSearch(item: FormGroup<PurchaseItemControls>) {
    const options = signal<Product[]>([]);
    const loading = signal(false);
    this.productSearchOptions.set(item, options);
    this.productSearchLoading.set(item, loading);

    const subscription = item.controls.productSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const search = query.trim();
          if (!search) {
            options.set([]);
            return of([] as Product[]);
          }

          loading.set(true);
          return this.productsService
            .getAll({
              filterList: [
                {
                  columnName: ['name', 'sku', 'brand', 'variants.sku', 'variants.sizeLabel'],
                  type: 'search',
                  value: search,
                },
              ],
              sortHeader: 'name',
              sortDirection: 'ASC',
              page: 1,
              limit: 20,
              isPagination: false,
            })
            .pipe(
              switchMap((response) => {
                const products = response.result?.documentItems;
                if (!products) {
                  this.notification.error('Product search returned an invalid response.');
                  return of([] as Product[]);
                }
                if (products.length === 0) {
                  return of([] as Product[]);
                }

                return forkJoin(
                  products.map((product) =>
                    product.variants !== undefined
                      ? of(product)
                      : this.productsService.getById(product._id).pipe(
                          map((productResponse) => {
                            if (!productResponse.result) {
                              throw new Error('Product details were not returned.');
                            }
                            return productResponse.result;
                          }),
                        ),
                  ),
                );
              }),
              catchError(() => {
                this.notification.error('Failed to search products and variants.');
                return of([] as Product[]);
              }),
              finalize(() => loading.set(false)),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((products) => options.set(products));

    this.productSearchSubscriptions.set(item, subscription);
  }

  private loadSelectedProduct(
    item: FormGroup<PurchaseItemControls>,
    productId: string,
    variantId: string,
  ) {
    this.productsService.getById(productId).subscribe({
      next: (response) => {
        const product = response.result;
        const variant = product?.variants?.find((option) => option._id === variantId);
        if (!product || !variant) {
          this.notification.error('Failed to load the selected product variant.');
          return;
        }

        this.productSearchOptions.get(item)?.set([product]);
        const label = `${product.name} — ${variant.sku}`;
        if (item.controls.productSearch.value === productId) {
          item.controls.productSearch.setValue(label, { emitEvent: false });
          this.selectedProductLabels.set(item, label);
        }
      },
      error: () => {
        this.notification.error('Failed to load the selected product variant.');
      },
    });
  }

  private loadSuppliers() {
    this.loadingSuppliers.set(true);
    this.suppliersService
      .getAll({
        filterList: [],
        sortHeader: 'companyName',
        sortDirection: 'ASC',
        page: 1,
        limit: 100,
        isPagination: false,
      })
      .subscribe({
        next: (response) => {
          this.availableSuppliers.set(response.result?.documentItems ?? []);
          if (this.selectedSupplierId) {
            this.supplierSearch.setValue(this.supplierLabel(this.selectedSupplierId));
          }
          this.loadingSuppliers.set(false);
        },
        error: () => {
          this.notification.error('Failed to load suppliers.');
          this.loadingSuppliers.set(false);
        },
      });
  }

  private dateInput(value: Date | null | undefined) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private batchNumberFor(date: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return match ? `B-${match[1].slice(-2)}${match[2]}${match[3]}` : '';
  }

  private generateInvoiceNumber() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `INV-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(
      now.getHours(),
    )}${pad(now.getMinutes())}`;
  }
}
