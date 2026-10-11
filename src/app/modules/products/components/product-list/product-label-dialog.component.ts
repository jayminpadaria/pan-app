import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  expDate: string;
  mrp: number;
  printQty: number;
}

const dateInput = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const batchNumberFor = (date: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `B-${match[1]}${match[2]}${match[3]}` : '';
};

const addMonths = (value: string, months: number) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }

  const target = new Date(year, month - 1 + months, 1);
  const lastDayOfTargetMonth = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDayOfTargetMonth));
  return dateInput(target);
};

@Component({
  selector: 'app-product-label-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  templateUrl: './product-label-dialog.component.html',
})
export class ProductLabelDialogComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<ProductLabelDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<ProductLabelDialogData>(MAT_DIALOG_DATA);
  private readonly initialMfdDate = dateInput(new Date());

  readonly form = this.formBuilder.group({
    batchNumber: [
      batchNumberFor(this.initialMfdDate),
      [Validators.required, Validators.pattern(/\S/)],
    ],
    mfdDate: [this.initialMfdDate, Validators.required],
    expDate: [addMonths(this.initialMfdDate, 3), Validators.required],
    mrp: [0, [Validators.required, Validators.min(0.01)]],
    printQty: [1, [Validators.required, Validators.min(1), Validators.pattern(/^[1-9]\d*$/)]],
  });

  ngOnInit() {
    this.form.controls.mfdDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mfdDate) => {
        this.form.controls.expDate.setValue(addMonths(mfdDate, 3));
      });
  }

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
      expDate: value.expDate,
      mrp: value.mrp,
      printQty: value.printQty,
    });
  }
}
