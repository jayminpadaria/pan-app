import { Component } from '@angular/core';
import { SalesListComponent } from '../../components/sales-list/sales-list.component';

@Component({
  imports: [SalesListComponent],
  selector: 'app-sales',
  standalone: true,
  templateUrl: './sales.html',
})
export class Sales {}
