import { Component } from '@angular/core';
import { StockListComponent } from '../../components/stock-list/stock-list.component';

@Component({
  imports: [StockListComponent],
  selector: 'app-stock',
  standalone: true,
  templateUrl: './stock.html',
})
export class Stock {}
