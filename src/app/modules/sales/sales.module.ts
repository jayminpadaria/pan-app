import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { CustomerCreateDialogComponent } from './components/sales-form/customer-create-dialog.component';
import { SalesRoutingModule } from './sales-routing.module';
import { Sales } from './pages/sales/sales';

@NgModule({
  declarations: [SalesFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatProgressBarModule,
    SalesRoutingModule,
    Sales,
    CustomerCreateDialogComponent,
  ],
})
export class SalesModule {}
