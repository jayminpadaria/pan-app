import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Product } from '../../../../shared/interfaces/product.interface';
import { Purchase, PurchaseItem, SOURCE_TYPE } from '../../../../shared/interfaces/purchase.interface';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { PurchasesService } from '../../../../shared/services/purchases.service';
import { SuppliersService } from '../../../../shared/services/suppliers.service';

@Component({
  selector: 'app-purchase-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressBarModule, RouterModule],
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

  readonly purchase = signal<Purchase | null>(null);
  readonly products = signal<Record<string, Product>>({});
  readonly supplier = signal<Supplier | null>(null);
  readonly loading = signal(false);
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

  isCompleted() {
    return this.purchase()?.status.trim().toUpperCase() === 'COMPLETED';
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
