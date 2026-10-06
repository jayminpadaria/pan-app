import { Component } from '@angular/core';
import { SupplierListComponent } from '../../components/supplier-list/supplier-list.component';

@Component({
  imports: [SupplierListComponent],
  selector: 'app-suppliers',
  standalone: true,
  templateUrl: './suppliers.html',
})
export class Suppliers {}
