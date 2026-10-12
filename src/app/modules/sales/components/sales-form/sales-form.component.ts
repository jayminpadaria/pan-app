import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Customer, CustomerInput } from '../../../../shared/interfaces/customer.interface';
import { StockLookupResponse } from '../../../../shared/interfaces/product-stock.interface';
import { Sales, SalesItem } from '../../../../shared/interfaces/sales.interface';
import { AuthService } from '../../../../shared/services/auth.service';
import { CustomersService } from '../../../../shared/services/customers.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SalesService } from '../../../../shared/services/sales.service';
import { CustomerCreateDialogComponent } from './customer-create-dialog.component';

interface SalesItemControls {
  _id: FormControl<string>;
  productId: FormControl<string>;
  productVariantId: FormControl<string>;
  productStockId: FormControl<string>;
  productName: FormControl<string>;
  availableQty: FormControl<number>;
  originalQuantity: FormControl<number>;
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly customersService = inject(CustomersService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly injector = inject(Injector);

  @ViewChild('barcodeInput') private barcodeInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('quantityInput') private quantityInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly saving = signal(false);
  readonly printing = signal(false);
  readonly scanning = signal(false);
  readonly loadingSale = signal(false);
  readonly loadingItemDetails = signal(false);
  readonly isEdit = signal(false);
  readonly isAdmin = this.auth.getUserIdentity()?.role?.trim().toLowerCase() === 'admin';
  readonly loadingCustomers = signal(false);
  readonly creatingCustomer = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly customerSearch = new FormControl('', { nonNullable: true });
  readonly barcode = new FormControl('', { nonNullable: true });
  readonly editingQuantities = signal<ReadonlySet<FormGroup<SalesItemControls>>>(new Set());
  readonly editingDiscounts = signal<ReadonlySet<FormGroup<SalesItemControls>>>(new Set());
  private saleId: string | null = null;
  private customersLoaded = false;

  readonly form = this.formBuilder.group({
    customerId: [''],
    salesDate: [today(), Validators.required],
    paymentStatus: ['UNPAID', Validators.required],
    paymentMethod: this.formBuilder.control<'CASH' | 'ONLINE'>('CASH', Validators.required),
    taxAmount: [0, [Validators.required, Validators.min(0)]],
    items: this.formBuilder.array<FormGroup<SalesItemControls>>([], Validators.minLength(1)),
  });

  get items() {
    return this.form.controls.items;
  }

  ngOnInit() {
    if (!this.isAdmin) {
      this.form.controls.salesDate.disable({ emitEvent: false });
    }

    this.saleId = this.route.snapshot.paramMap.get('id');
    if (!this.saleId) {
      this.loadCustomers();
      this.focusBarcodeInput();
      return;
    }

    this.isEdit.set(true);
    this.loadingSale.set(true);
    this.salesService.getById(this.saleId).subscribe({
      next: (response) => {
        const sale = response.result;
        if (!sale) {
          this.notification.error('Sale not found.');
          this.loadingSale.set(false);
          this.router.navigate(['/app/sales']);
          return;
        }
        if (sale.paymentStatus.trim().toUpperCase() === 'PAID') {
          this.notification.error('Paid sales cannot be edited.');
          this.loadingSale.set(false);
          this.router.navigate(['/app/sales']);
          return;
        }

        this.patchSale(sale);
        this.loadingSale.set(false);
        this.focusBarcodeInput();
      },
      error: () => {
        this.notification.error('Failed to load sale.');
        this.loadingSale.set(false);
        this.router.navigate(['/app/sales']);
      },
    });
  }

  scanBarcode(event?: Event) {
    event?.preventDefault();
    const barcode = this.barcode.value.trim();
    if (this.loadingSale() || this.scanning() || this.loadingItemDetails() || !barcode) {
      return;
    }

    this.scanning.set(true);
    this.salesService.stock(barcode).subscribe({
      next: (response) => {
        const lookup = response.result;
        if (!lookup?.product?._id || !lookup.variant?._id || !lookup.stock) {
          this.notification.error(
            'The barcode lookup returned incomplete product or stock details.',
          );
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
    const item = this.items.at(index);
    this.updateEditingItems('quantity', item, false);
    this.updateEditingItems('discountAmount', item, false);
    this.items.removeAt(index);
  }

  filteredCustomers() {
    const search = this.customerSearch.value.trim().toLowerCase();
    if (!search) {
      return this.customers();
    }

    return this.customers().filter((customer) =>
      [customer.firstName, customer.lastName, customer.phone, customer.email]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }

  onCustomerSearchInput() {
    const selectedCustomer = this.customers().find(
      (customer) => customer._id === this.form.controls.customerId.value,
    );
    if (!selectedCustomer || this.customerSearch.value !== this.customerLabel(selectedCustomer)) {
      this.form.controls.customerId.setValue('');
    }
  }

  selectCustomer(event: MatAutocompleteSelectedEvent) {
    const customerId = event.option.value as string;
    if (!customerId) {
      this.form.controls.customerId.setValue('');
      this.customerSearch.setValue('');
      return;
    }

    const customer = this.customers().find((entry) => entry._id === customerId);
    if (!customer) {
      this.notification.error('The selected customer could not be found.');
      this.form.controls.customerId.setValue('');
      this.customerSearch.setValue('');
      return;
    }

    this.form.controls.customerId.setValue(customer._id);
    this.customerSearch.setValue(this.customerLabel(customer));
  }

  ensureCustomersLoaded() {
    if (!this.customersLoaded && !this.loadingCustomers()) {
      this.loadCustomers();
    }
  }

  addCustomer() {
    const dialogRef = this.dialog.open(CustomerCreateDialogComponent, {
      width: 'min(560px, 95vw)',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((customer?: CustomerInput) => {
      if (customer) {
        this.createCustomer(customer);
      }
    });
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

  isInlineEditing(item: FormGroup<SalesItemControls>, field: 'quantity' | 'discountAmount') {
    return (field === 'quantity' ? this.editingQuantities() : this.editingDiscounts()).has(item);
  }

  editInlineField(item: FormGroup<SalesItemControls>, field: 'quantity' | 'discountAmount') {
    this.updateEditingItems(field, item, true);
  }

  saveInlineField(item: FormGroup<SalesItemControls>, field: 'quantity' | 'discountAmount') {
    const control = item.controls[field];
    control.markAsTouched();
    if (
      control.invalid ||
      (field === 'discountAmount' && item.hasError('discountExceedsLineTotal'))
    ) {
      return;
    }

    control.markAsPristine();
    this.updateEditingItems(field, item, false);
  }

  private updateEditingItems(
    field: 'quantity' | 'discountAmount',
    item: FormGroup<SalesItemControls>,
    editing: boolean,
  ) {
    const editingItems = field === 'quantity' ? this.editingQuantities : this.editingDiscounts;
    editingItems.update((current) => {
      const next = new Set(current);
      if (editing) {
        next.add(item);
      } else {
        next.delete(item);
      }
      return next;
    });
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
  isInvalid(name: 'salesDate' | 'paymentStatus' | 'taxAmount') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  saveSale() {
    if (this.form.invalid || this.scanning() || this.loadingItemDetails()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const currentUtcTime = new Date().toISOString().slice(11);
    const sale: Omit<Sales, '_id'> = {
      customerId: value.customerId || null,
      items: value.items.map((item): SalesItem => ({
        ...(item._id ? { _id: item._id } : {}),
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
      ...(value.paymentStatus === 'PAID' ? { paymentMethod: value.paymentMethod } : {}),
      salesDate: new Date(`${value.salesDate}T${currentUtcTime}`),
    };

    if (this.isEdit()) {
      const saleId = this.saleId;
      if (!saleId) {
        this.notification.error('Cannot update sale because its ID is missing.');
        return;
      }

      this.saving.set(true);
      this.salesService.update(saleId, sale).subscribe({
        next: () => {
          this.saving.set(false);
          this.notification.success('Sale updated successfully.');
          this.promptToPrint(saleId);
        },
        error: () => {
          this.notification.error('Failed to update sale.');
          this.saving.set(false);
        },
      });
      return;
    }

    this.saving.set(true);
    this.salesService.create(sale).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notification.success('Sale created successfully.');
        const createdSaleId = response.result?._id;
        if (!createdSaleId) {
          this.notification.error(
            'The sale was created, but no sale ID was returned for printing.',
          );
          this.router.navigate(['/app/sales']);
          return;
        }

        this.promptToPrint(createdSaleId);
      },
      error: () => {
        this.notification.error('Failed to create sale.');
        this.saving.set(false);
      },
    });
  }

  printCurrentSale() {
    if (this.saleId) {
      this.printSaleById(this.saleId);
    }
  }

  private promptToPrint(saleId: string) {
    this.notification.confirmation(
      'Would you like to print the bill?',
      () => this.printSaleById(saleId, true),
      'Print bill?',
      () => this.router.navigate(['/app/sales']),
      undefined,
      'Yes',
      'No',
    );
  }

  private printSaleById(saleId: string, returnToList = false) {
    if (this.printing()) {
      return;
    }

    this.printing.set(true);
    this.salesService.print(saleId).subscribe({
      next: () => {
        this.notification.success('Sale sent to print.');
        this.printing.set(false);
        if (returnToList) {
          this.router.navigate(['/app/sales']);
        }
      },
      error: () => {
        this.notification.error('Failed to print sale.');
        this.printing.set(false);
        if (returnToList) {
          this.router.navigate(['/app/sales']);
        }
      },
    });
  }

  private patchSale(sale: Sales) {
    if (sale.customer) {
      const customer: Customer = {
        _id: sale.customer._id,
        firstName: sale.customer.firstName,
        lastName: sale.customer.lastName,
        email: sale.customer.email ?? '',
        phone: sale.customer.phone ?? '',
      };
      this.customers.update((customers) =>
        customers.some((existing) => existing._id === customer._id)
          ? customers.map((existing) => (existing._id === customer._id ? customer : existing))
          : [...customers, customer],
      );
    }

    this.form.patchValue(
      {
        customerId: sale.customerId ?? '',
        salesDate: this.dateInput(sale.salesDate),
        paymentStatus: sale.paymentStatus.trim().toUpperCase(),
        paymentMethod: sale.paymentMethod ?? 'CASH',
        taxAmount: sale.taxAmount,
      },
      { emitEvent: false },
    );
    this.syncCustomerSearchFromSelection();

    sale.items.forEach((saleItem) => this.addExistingItem(saleItem));
  }

  private addExistingItem(saleItem: SalesItem) {
    const availableQty =
      saleItem.quantity +
      (saleItem.stock?.isActive && !saleItem.stock.isDeleted && !saleItem.stock.isDeadStock
        ? Math.max(0, saleItem.stock.availableQty ?? 0)
        : 0);
    const item = this.formBuilder.group(
      {
        _id: [saleItem._id ?? ''],
        productId: [saleItem.productId],
        productVariantId: [saleItem.productVariantId],
        productStockId: [saleItem.productStockId],
        productName: [
          saleItem.product?.name && saleItem.variant?.sku
            ? `${saleItem.product.name} — ${saleItem.variant.sku}`
            : `${saleItem.productId} — ${saleItem.productVariantId}`,
        ],
        availableQty: [availableQty],
        originalQuantity: [saleItem.quantity],
        quantity: [
          saleItem.quantity,
          [Validators.required, Validators.min(1), Validators.max(availableQty)],
        ],
        costPriceAtSale: [saleItem.costPriceAtSale],
        soldPrice: [saleItem.soldPrice, [Validators.required, Validators.min(0)]],
        discountAmount: [saleItem.discountAmount, [Validators.required, Validators.min(0)]],
      },
      { validators: validLineDiscount },
    );
    this.items.push(item);
  }

  private addStockedVariant(lookup: StockLookupResponse) {
    const { product, variant } = lookup;
    const batches = lookup.stock.batches
      .filter((batch) => batch.isActive && !batch.isDeleted && batch.availableQty > 0)
      .sort(
        (left, right) => new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime(),
      );
    const batch = batches.find((candidate) => {
      const existing = this.items.controls.find(
        (item) => item.controls.productStockId.value === candidate._id,
      );
      return !existing || existing.controls.quantity.value < existing.controls.availableQty.value;
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
      // this.focusQuantityInput(this.items.controls.indexOf(existingItem));
      return;
    }

    const item = this.formBuilder.group(
      {
        _id: [''],
        productId: [product._id],
        productVariantId: [variant._id],
        productStockId: [batch._id],
        productName: [`${product.name} — ${variant.sku}`],
        availableQty: [batch.availableQty],
        originalQuantity: [0],
        quantity: [1, [Validators.required, Validators.min(1), Validators.max(batch.availableQty)]],
        costPriceAtSale: [batch.costPrice],
        soldPrice: [batch.retailPrice, [Validators.required, Validators.min(0)]],
        discountAmount: [0, [Validators.required, Validators.min(0)]],
      },
      { validators: validLineDiscount },
    );
    this.items.push(item);
    // this.focusQuantityInput(this.items.length - 1);
  }

  private focusQuantityInput(index: number) {
    afterNextRender(() => this.quantityInputs.get(index)?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  private focusBarcodeInput() {
    afterNextRender(() => this.barcodeInput?.nativeElement.focus(), {
      injector: this.injector,
    });
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
          const customers = response.result?.documentItems ?? [];
          this.customersLoaded = true;
          const selectedCustomer = this.customers().find(
            (customer) => customer._id === this.form.controls.customerId.value,
          );
          this.customers.set(
            selectedCustomer && !customers.some((customer) => customer._id === selectedCustomer._id)
              ? [...customers, selectedCustomer]
              : customers,
          );
          const defaultWalkingCustomer = !this.saleId
            ? customers.find((customer) => customer.isDefaultWalking === true)
            : undefined;
          if (defaultWalkingCustomer) {
            this.form.controls.customerId.setValue(defaultWalkingCustomer._id);
            this.customerSearch.setValue(this.customerLabel(defaultWalkingCustomer));
          } else {
            this.syncCustomerSearchFromSelection();
          }
          this.loadingCustomers.set(false);
        },
        error: () => {
          this.notification.error('Failed to load customers.');
          this.loadingCustomers.set(false);
        },
      });
  }

  private createCustomer(customerInput: CustomerInput) {
    this.creatingCustomer.set(true);
    this.customersService.create(customerInput).subscribe({
      next: (response) => {
        const customer = this.customerFromResponse(response.result, customerInput);
        this.refreshCustomersAndSelect(customerInput, customer);
      },
      error: () => {
        this.notification.error('Failed to create customer.');
        this.creatingCustomer.set(false);
      },
    });
  }

  private refreshCustomersAndSelect(
    customerInput: CustomerInput,
    createdCustomer: Customer | null,
  ) {
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
          const customers = response.result?.documentItems;
          if (!customers) {
            this.notification.error(
              'Customer was created, but the customer list could not be refreshed.',
            );
            this.creatingCustomer.set(false);
            return;
          }

          this.customers.set(customers);
          const customerFromList =
            customers.find((customer) => customer._id === createdCustomer?._id) ??
            customers.find(
              (customer) =>
                customer.firstName.trim().toLowerCase() === customerInput.firstName.toLowerCase() &&
                customer.lastName.trim().toLowerCase() === customerInput.lastName.toLowerCase() &&
                customer.phone.trim() === customerInput.phone &&
                customer.email.trim().toLowerCase() === customerInput.email.toLowerCase(),
            );
          const selectedCustomer = customerFromList ?? createdCustomer;
          if (!selectedCustomer) {
            this.notification.error(
              'Customer was created, but could not be selected for this sale.',
            );
            this.creatingCustomer.set(false);
            return;
          }

          this.selectNewCustomer(selectedCustomer);
          this.creatingCustomer.set(false);
          this.notification.success('Customer added and selected for this sale.');
        },
        error: () => {
          if (createdCustomer) {
            this.selectNewCustomer(createdCustomer);
            this.notification.error(
              'Customer was added to this sale, but the customer list could not be refreshed.',
            );
            this.creatingCustomer.set(false);
            return;
          }
          this.notification.error(
            'Customer was created, but the customer list could not be refreshed.',
          );
          this.creatingCustomer.set(false);
        },
      });
  }

  private customerFromResponse(result: unknown, customerInput: CustomerInput): Customer | null {
    if (typeof result === 'string' && result) {
      return { _id: result, ...customerInput };
    }
    if (typeof result !== 'object' || result === null) {
      return null;
    }
    const candidate =
      'customer' in result && typeof result.customer === 'object' && result.customer !== null
        ? result.customer
        : result;
    if (
      '_id' in candidate &&
      typeof candidate._id === 'string' &&
      'firstName' in candidate &&
      typeof candidate.firstName === 'string' &&
      'lastName' in candidate &&
      typeof candidate.lastName === 'string' &&
      'phone' in candidate &&
      typeof candidate.phone === 'string' &&
      'email' in candidate &&
      typeof candidate.email === 'string'
    ) {
      return {
        _id: candidate._id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: candidate.phone,
        email: candidate.email,
      };
    }
    if ('_id' in candidate && typeof candidate._id === 'string' && candidate._id) {
      return { _id: candidate._id, ...customerInput };
    }
    return null;
  }

  private selectNewCustomer(customer: Customer) {
    this.customers.update((customers) =>
      customers.some((existing) => existing._id === customer._id)
        ? customers
        : [...customers, customer],
    );
    this.form.controls.customerId.setValue(customer._id);
    this.customerSearch.setValue(this.customerLabel(customer));
  }

  private syncCustomerSearchFromSelection() {
    const selectedCustomer = this.customers().find(
      (customer) => customer._id === this.form.controls.customerId.value,
    );
    this.customerSearch.setValue(selectedCustomer ? this.customerLabel(selectedCustomer) : '');
  }

  private customerLabel(
    customer: Pick<Customer, 'firstName' | 'lastName'> & Partial<Pick<Customer, 'phone'>>,
  ) {
    const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
    return customer.phone ? `${name} — ${customer.phone}` : name;
  }

  private dateInput(value: Date | string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
