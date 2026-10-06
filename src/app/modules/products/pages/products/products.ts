import { Component } from '@angular/core';
import { ProductListComponent } from '../../components/product-list/product-list.component';

@Component({
  imports: [ProductListComponent],
  selector: 'app-products',
  standalone: true,
  styleUrl: './products.scss',
  templateUrl: './products.html',
})
export class Products {}
