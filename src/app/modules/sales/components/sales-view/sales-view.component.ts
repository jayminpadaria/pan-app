import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { Product } from '../../../../shared/interfaces/product.interface';
import { Sales, SalesItem } from '../../../../shared/interfaces/sales.interface';
import { CustomersService } from '../../../../shared/services/customers.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProductsService } from '../../../../shared/services/products.service';
import { SalesService } from '../../../../shared/services/sales.service';

@Component({
  selector: 'app-sales-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressBarModule, RouterModule],
  templateUrl: './sales-view.component.html',
  styleUrl: './sales-view.component.scss',
})
export class SalesViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly customersService = inject(CustomersService);
  private readonly productsService = inject(ProductsService);
  private readonly notification = inject(NotificationService);

  readonly sale = signal<Sales | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly products = signal<Record<string, Product>>({});
  readonly loading = signal(false);
  private productLookupErrorNotified = false;

  ngOnInit() {
    const saleId = this.route.snapshot.paramMap.get('id');
    if (!saleId) {
      this.notification.error('Sale not found.');
      this.router.navigate(['/app/sales']);
      return;
    }

    this.loading.set(true);
    this.salesService.getById(saleId).subscribe({
      next: (response) => {
        const sale = response.result;
        if (!sale) {
          this.notification.error('Sale not found.');
          this.loading.set(false);
          this.router.navigate(['/app/sales']);
          return;
        }

        this.sale.set(sale);
        this.loadRelatedRecords(sale);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load sale.');
        this.loading.set(false);
        this.router.navigate(['/app/sales']);
      },
    });
  }

  customerName() {
    const sale = this.sale();
    if (!sale?.customerId) {
      return 'Walk-in';
    }
    const customer = this.customer();
    return customer
      ? `${customer.firstName} ${customer.lastName}`
      : sale.customerId;
  }

  productName(item: SalesItem) {
    return this.products()[item.productId]?.name ?? item.productId;
  }

  variantLabel(item: SalesItem) {
    const variant = this.products()[item.productId]?.variants?.find(
      (candidate) => candidate._id === item.productVariantId,
    );
    return variant
      ? `${variant.sku} (${variant.weight} ${variant.unit})`
      : item.productVariantId;
  }

  lineTotal(item: SalesItem) {
    return Math.max(0, item.quantity * item.soldPrice - item.discountAmount);
  }

  private loadRelatedRecords(sale: Sales) {
    if (sale.customerId) {
      this.customersService.getById(sale.customerId).subscribe({
        next: (response) => this.customer.set(response.result ?? null),
        error: () => this.notification.error('Failed to load customer details.'),
      });
    }

    const productIds = [...new Set(sale.items.map((item) => item.productId))];
    productIds.forEach((productId) => {
      this.productsService.getById(productId).subscribe({
        next: (response) => {
          const product = response.result;
          if (product) {
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
