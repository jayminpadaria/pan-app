import { Component } from '@angular/core';
import { CustomerListComponent } from '../../components/customer-list/customer-list.component';

@Component({
  imports: [CustomerListComponent],
  selector: 'app-customers',
  standalone: true,
  templateUrl: './customers.html',
})
export class Customers {}
