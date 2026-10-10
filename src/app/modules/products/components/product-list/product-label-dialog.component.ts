import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

interface ProductLabelDialogData {
  productName: string;
  sku: string;
}

export interface ProductLabelInput {
  batchNumber: string;
  mfdDate: string;
}

@Component({
  selector: 'app-product-label-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './product-label-dialog.component.html',
})
export class ProductLabelDialogComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<ProductLabelDialogComponent>);
  readonly data = inject<ProductLabelDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group({
    batchNumber: ['', [Validators.required, Validators.pattern(/\S/)]],
    mfdDate: ['', Validators.required],
  });

  isInvalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      batchNumber: value.batchNumber.trim(),
      mfdDate: value.mfdDate,
    });
  }
}
