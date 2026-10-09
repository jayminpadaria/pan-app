import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ProductVariantInput } from '../../../../shared/interfaces/product.interface';

interface ProductVariantDialogData {
  variant?: ProductVariantInput;
}

@Component({
  selector: 'app-product-variant-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './product-variant-dialog.component.html',
})
export class ProductVariantDialogComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<ProductVariantDialogComponent>);
  readonly data = inject<ProductVariantDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group({
    sku: [this.data.variant?.sku ?? '', Validators.required],
    weight: [this.data.variant?.weight ?? 0, [Validators.required, Validators.min(0)]],
    unit: [this.data.variant?.unit ?? '', Validators.required],
  });

  get title() {
    return this.data.variant ? 'Edit variant' : 'Add variant';
  }

  isInvalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
