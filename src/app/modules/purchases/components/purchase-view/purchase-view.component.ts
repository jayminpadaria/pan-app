import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Product } from '../../../../shared/interfaces/product.interface';
import { Purchase, PurchaseItem, SOURCE_TYPE } from '../../../../shared/interfaces/purchase.interface';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { PurchasesService } from '../../../../shared/services/purchases.service';
import { SuppliersService } from '../../../../shared/services/suppliers.service';
import {
  ProductLabelDialogComponent,
  ProductLabelInput,
} from '../../../products/components/product-list/product-label-dialog.component';
import {
  PurchaseItemEditDialogComponent,
  PurchaseItemEditInput,
} from './purchase-item-edit-dialog.component';

@Component({
  selector: 'app-purchase-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatProgressBarModule, RouterModule],
  templateUrl: './purchase-view.component.html',
  styleUrl: './purchase-view.component.scss',
})
export class PurchaseViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchasesService = inject(PurchasesService);
  private readonly productsService = inject(ProductsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly purchase = signal<Purchase | null>(null);
  readonly products = signal<Record<string, Product>>({});
  readonly supplier = signal<Supplier | null>(null);
  readonly loading = signal(false);
  readonly printingVariantId = signal<string | null>(null);
  readonly editingItemId = signal<string | null>(null);
  private productLookupErrorNotified = false;

  ngOnInit() {
    const purchaseId = this.route.snapshot.paramMap.get('id');
    if (!purchaseId) {
      this.notification.error('Purchase not found.');
      return;
    }

    this.loading.set(true);
    this.purchasesService.getById(purchaseId).subscribe({
      next: (response) => {
        if (!response.result) {
          this.notification.error('Purchase not found.');
          this.router.navigate(['/app/purchases']);
          return;
        }

        this.purchase.set(response.result);
        this.loadRelatedRecords(response.result);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load purchase.');
        this.loading.set(false);
        this.router.navigate(['/app/purchases']);
      },
    });
  }

  sourceTypeLabel(sourceType: SOURCE_TYPE) {
    return sourceType === SOURCE_TYPE.INTERNAL_PRODUCTION
      ? 'Internal production'
      : 'External vendor';
  }

  supplierLabel() {
    const purchase = this.purchase();
    if (!purchase?.supplierId) {
      return '—';
    }

    const supplier = this.supplier();
    return supplier
      ? `${supplier.companyName} — ${supplier.contactName}`
      : purchase.supplierId;
  }

  productName(item: PurchaseItem) {
    return this.products()[item.productId]?.name ?? item.productId;
  }

  variantLabel(item: PurchaseItem) {
    const variant = this.products()[item.productId]?.variants?.find(
      (candidate) => candidate._id === item.productVariantId,
    );
    return variant ? `${variant.sku} (${variant.weight} ${variant.unit})` : item.productVariantId;
  }

  lineTotal(item: PurchaseItem) {
    return item.quantity * item.costPrice;
  }

  editItem(item: PurchaseItem): void {
    const purchase = this.purchase();
    if (!purchase || !item.isEdit || !item._id || this.editingItemId() !== null) {
      return;
    }

    this.editingItemId.set(item._id);
    this.dialog
      .open(PurchaseItemEditDialogComponent, {
        width: '520px',
        maxWidth: '95vw',
        data: {
          item,
          productName: this.productName(item),
          variantLabel: this.variantLabel(item),
        },
      })
      .afterClosed()
      .subscribe((changes?: PurchaseItemEditInput) => {
        if (!changes) {
          this.editingItemId.set(null);
          return;
        }

        this.purchasesService
          .updateItem(purchase._id, item._id!, {
            productId: item.productId,
            productVariantId: item.productVariantId,
            quantity: changes.quantity,
            costPrice: changes.costPrice,
            retailPrice: changes.retailPrice,
            expiryDate: changes.expiryDate,
            _id: item._id!,
          })
          .subscribe({
            next: () => {
              this.notification.success('Purchase item updated successfully.');
              this.refreshPurchase(purchase._id);
            },
            error: () => {
              this.notification.error('Failed to update purchase item.');
              this.editingItemId.set(null);
            },
          });
      });
  }

  printItemLabel(purchase: Purchase, item: PurchaseItem) {
    if (this.printingVariantId() !== null || this.editingItemId() !== null) {
      return;
    }

    const variant = this.products()[item.productId]?.variants?.find(
      (candidate) => candidate._id === item.productVariantId,
    );
    const mfdDate = this.dateInput(purchase.transactionDate);
    const expDate = this.dateInput(item.expiryDate);
    const defaultPrintQty =
      Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;

    this.printingVariantId.set(item.productVariantId);
    this.dialog
      .open(ProductLabelDialogComponent, {
        width: '420px',
        maxWidth: '95vw',
        data: {
          productName: this.productName(item),
          sku: variant?.sku ?? item.productVariantId,
          ...(mfdDate ? { mfdDate } : {}),
          ...(expDate ? { expDate } : {}),
          mrp: item.retailPrice > 0 ? item.retailPrice : undefined,
          printQty: defaultPrintQty,
          lockLabelDetails: true,
        },
      })
      .afterClosed()
      .subscribe((label?: ProductLabelInput) => {
        if (!label) {
          this.printingVariantId.set(null);
          return;
        }

        this.productsService.printVariantLabel(item.productVariantId, label).subscribe({
          next: () => {
            this.notification.success('Variant label sent to print.');
            this.printingVariantId.set(null);
          },
          error: () => {
            this.notification.error('Failed to print variant label.');
            this.printingVariantId.set(null);
          },
        });
      });
  }

  isCompleted() {
    return this.purchase()?.status.trim().toUpperCase() === 'COMPLETED';
  }

  private refreshPurchase(purchaseId: string): void {
    this.loading.set(true);
    this.purchasesService.getById(purchaseId).subscribe({
      next: (response) => {
        if (!response.result) {
          this.notification.error('Item updated, but the refreshed purchase was not returned.');
          this.loading.set(false);
          this.editingItemId.set(null);
          return;
        }

        this.purchase.set(response.result);
        this.loadRelatedRecords(response.result);
        this.loading.set(false);
        this.editingItemId.set(null);
      },
      error: () => {
        this.notification.error('Item updated, but failed to refresh purchase details.');
        this.loading.set(false);
        this.editingItemId.set(null);
      },
    });
  }

  private dateInput(value: Date | null | undefined): string {
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

  private loadRelatedRecords(purchase: Purchase) {
    if (purchase.supplierId) {
      this.suppliersService.getById(purchase.supplierId).subscribe({
        next: (response) => this.supplier.set(response.result ?? null),
        error: () => this.notification.error('Failed to load purchase supplier details.'),
      });
    }

    const productIds = [...new Set(purchase.items.map((item) => item.productId))];
    productIds.forEach((productId) => {
      this.productsService.getById(productId).subscribe({
        next: (response) => {
          if (response.result) {
            const product = response.result;
            this.products.update((current) => ({ ...current, [productId]: product }));
          } else {
            this.notifyProductLookupError();
          }
        },
        error: () => this.notifyProductLookupError(),
      });
    });
  }

  private notifyProductLookupError() {
    if (!this.productLookupErrorNotified) {
      this.notification.error('Some product details could not be loaded; showing product IDs.');
      this.productLookupErrorNotified = true;
    }
  }
}
