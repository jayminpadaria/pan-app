import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type StockCondition = 'EXPIRED' | 'OBSOLETE';

interface StockConditionDialogData {
  productName: string;
  variantName: string;
  availableQty: number;
}

export interface StockConditionInput {
  condition: StockCondition;
  quantity: number;
}

@Component({
  selector: 'app-stock-condition-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './stock-condition-dialog.component.html',
})
export class StockConditionDialogComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<StockConditionDialogComponent>);
  readonly data = inject<StockConditionDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group({
    condition: this.formBuilder.control<StockCondition>('EXPIRED', Validators.required),
    quantity: this.formBuilder.control(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(this.data.availableQty),
      Validators.pattern(/^[1-9]\d*$/),
    ]),
  });

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
