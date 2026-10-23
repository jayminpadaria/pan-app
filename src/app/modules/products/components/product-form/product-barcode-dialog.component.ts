import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

interface ProductBarcodeDialogData {
  productName: string;
  sku: string;
  barcode?: string;
}

export interface ProductBarcodeDialogResult {
  barcode: string;
}

@Component({
  selector: 'app-product-barcode-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './product-barcode-dialog.component.html',
})
export class ProductBarcodeDialogComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<ProductBarcodeDialogComponent>);
  readonly data = inject<ProductBarcodeDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group({
    barcode: [this.data.barcode ?? ''],
  });

  cancel() {
    this.dialogRef.close();
  }

  save() {
    this.dialogRef.close({ barcode: this.form.controls.barcode.value.trim() });
  }
}
