import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { SuppliersRoutingModule } from './suppliers-routing.module';
import { Suppliers } from './pages/suppliers/suppliers';

@NgModule({
  declarations: [SupplierFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressBarModule,
    SuppliersRoutingModule,
    Suppliers,
  ],
})
export class SuppliersModule {}
