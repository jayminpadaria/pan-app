import { Component } from '@angular/core';
import { PurchaseListComponent } from '../../components/purchase-list/purchase-list.component';

@Component({
  imports: [PurchaseListComponent],
  selector: 'app-purchases',
  standalone: true,
  styleUrl: './purchases.scss',
  templateUrl: './purchases.html',
})
export class Purchases {}
