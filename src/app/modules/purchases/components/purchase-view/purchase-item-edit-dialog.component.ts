import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PurchaseItem } from '../../../../shared/interfaces/purchase.interface';

interface PurchaseItemEditDialogData {
  item: PurchaseItem;
  productName: string;
  variantLabel: string;
}

export interface PurchaseItemEditInput {
  quantity: number;
  costPrice: number;
  retailPrice: number;
  expiryDate: string;
}

const retailPriceGreaterThanCost: ValidatorFn = (control) => {
  const costPrice = Number(control.get('costPrice')?.value);
  const retailPrice = Number(control.get('retailPrice')?.value);
  return Number.isFinite(costPrice) &&
    Number.isFinite(retailPrice) &&
    retailPrice > costPrice
    ? null
    : { retailPriceMustExceedCost: true };
};

const dateInput = (value: Date | null | undefined): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

@Component({
  selector: 'app-purchase-item-edit-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './purchase-item-edit-dialog.component.html',
})
export class PurchaseItemEditDialogComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<PurchaseItemEditDialogComponent>);
  readonly data = inject<PurchaseItemEditDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group(
    {
      quantity: [
        this.data.item.quantity,
        [Validators.required, Validators.min(1), Validators.pattern(/^[1-9]\d*$/)],
      ],
      costPrice: [
        this.data.item.costPrice,
        [Validators.required, Validators.min(0)],
      ],
      retailPrice: [
        this.data.item.retailPrice,
        [Validators.required, Validators.min(0)],
      ],
      expiryDate: [dateInput(this.data.item.expiryDate), Validators.required],
    },
    { validators: retailPriceGreaterThanCost },
  );

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  retailPriceMustExceedCost(): boolean {
    return (
      this.form.hasError('retailPriceMustExceedCost') &&
      (this.form.controls.costPrice.dirty ||
        this.form.controls.costPrice.touched ||
        this.form.controls.retailPrice.dirty ||
        this.form.controls.retailPrice.touched)
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      quantity: value.quantity,
      costPrice: value.costPrice,
      retailPrice: value.retailPrice,
      expiryDate: new Date(`${value.expiryDate}T00:00:00.000Z`).toISOString(),
    } satisfies PurchaseItemEditInput);
  }
}
