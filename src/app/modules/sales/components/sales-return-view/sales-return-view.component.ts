import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Sales, SalesItem } from '../../../../shared/interfaces/sales.interface';
import {
  SalesReturn,
  SalesReturnItem,
} from '../../../../shared/interfaces/sales-return.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SalesService } from '../../../../shared/services/sales.service';

@Component({
  selector: 'app-sales-return-view',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressBarModule, RouterModule],
  templateUrl: './sales-return-view.component.html',
})
export class SalesReturnViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly sale = signal<Sales | null>(null);
  readonly returns = signal<SalesReturn[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private salesId: string | null = null;

  ngOnInit(): void {
    this.salesId = this.route.snapshot.paramMap.get('id');
    if (!this.salesId) {
      this.notification.error('Sales invoice not found.');
      this.router.navigate(['/app/sales']);
      return;
    }

    this.loadReturns();
  }

  totalRefunded(): number {
    const returnedAmount = this.sale()?.returnedAmount;
    if (returnedAmount !== undefined) return returnedAmount;
    return this.returns().reduce(
      (total, salesReturn) => total + salesReturn.totalRefundedToCustomer,
      0,
    );
  }

  retryLoadingReturns(): void {
    this.loadReturns();
  }

  productName(salesReturnItem: SalesReturnItem): string {
    const saleItem = this.findSaleItem(salesReturnItem);
    return saleItem?.product?.name ?? saleItem?.productId ?? salesReturnItem.productVariantId;
  }

  variantName(salesReturnItem: SalesReturnItem): string {
    const saleItem = this.findSaleItem(salesReturnItem);
    return saleItem?.variant
      ? `${saleItem.variant.sku} (${saleItem.variant.weight} ${saleItem.variant.unit})`
      : salesReturnItem.productVariantId;
  }

  private findSaleItem(salesReturnItem: SalesReturnItem): SalesItem | undefined {
    return this.sale()?.items.find(
      (saleItem) =>
        saleItem.productVariantId === salesReturnItem.productVariantId &&
        saleItem.productStockId === salesReturnItem.productStockId,
    );
  }

  private loadReturns(): void {
    if (!this.salesId) return;

    this.loading.set(true);
    this.loadError.set(false);
    this.salesService.getById(this.salesId).subscribe({
      next: (response) => {
        const sale = response.result;
        if (!sale) {
          this.notification.error('Sales invoice not found.');
          this.router.navigate(['/app/sales']);
          return;
        }

        if (!Array.isArray(sale.salesReturns)) {
          this.sale.set(sale);
          this.returns.set([]);
          this.loadError.set(true);
          this.loading.set(false);
          this.notification.error('The sales invoice response did not include its return history.');
          return;
        }

        this.sale.set(sale);
        this.returns.set(sale.salesReturns);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
        this.notification.error('Failed to load return bills for this invoice.');
      },
    });
  }
}
