import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PurchaseFormComponent } from './components/purchase-form/purchase-form.component';
import { PurchasesRoutingModule } from './purchases-routing.module';
import { Purchases } from './pages/purchases/purchases';

@NgModule({
  declarations: [PurchaseFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatInputModule,
    MatProgressBarModule,
    PurchasesRoutingModule,
    Purchases,
  ],
})
export class PurchasesModule {}
