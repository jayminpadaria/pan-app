import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { SalesRoutingModule } from './sales-routing.module';
import { Sales } from './pages/sales/sales';

@NgModule({
  declarations: [SalesFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    SalesRoutingModule,
    Sales,
  ],
})
export class SalesModule {}
