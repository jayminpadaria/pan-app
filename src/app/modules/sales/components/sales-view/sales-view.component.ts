import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Sales, SalesItem } from '../../../../shared/interfaces/sales.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
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
  private readonly notification = inject(NotificationService);

  readonly sale = signal<Sales | null>(null);
  readonly loading = signal(false);
  readonly printing = signal(false);

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
        this.sale.set(sale);
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
    return sale.customer
      ? `${sale.customer.firstName} ${sale.customer.lastName}`.trim()
      : sale.customerId;
  }

  productName(item: SalesItem) {
    return item.product?.name ?? item.productId;
  }

  variantLabel(item: SalesItem) {
    return item.variant
      ? `${item.variant.sku} (${item.variant.weight} ${item.variant.unit})`
      : item.productVariantId;
  }

  lineTotal(item: SalesItem) {
    return Math.max(0, item.quantity * item.soldPrice - item.discountAmount);
  }

  printSale() {
    const saleId = this.sale()?._id;
    if (!saleId || this.printing()) {
      return;
    }

    this.printing.set(true);
    this.salesService.print(saleId).subscribe({
      next: () => {
        this.notification.success('Sale sent to print.');
        this.printing.set(false);
      },
      error: () => {
        this.notification.error('Failed to print sale.');
        this.printing.set(false);
      },
    });
  }

}
