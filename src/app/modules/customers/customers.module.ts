import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CustomerFormComponent } from './components/customer-form/customer-form.component';
import { CustomersRoutingModule } from './customers-routing.module';
import { Customers } from './pages/customers/customers';

@NgModule({
  declarations: [CustomerFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressBarModule,
    CustomersRoutingModule,
    Customers,
  ],
})
export class CustomersModule {}
