import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BillOfMaterialsRoutingModule } from './bill-of-materials-routing.module';
import { BillOfMaterialsFormComponent } from './components/bill-of-materials-form/bill-of-materials-form.component';
import { BillOfMaterialsListComponent } from './components/bill-of-materials-list/bill-of-materials-list.component';

@NgModule({
  declarations: [BillOfMaterialsFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    BillOfMaterialsRoutingModule,
    BillOfMaterialsListComponent,
  ],
})
export class BillOfMaterialsModule {}
