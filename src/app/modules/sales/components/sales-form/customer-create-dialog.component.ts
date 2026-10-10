import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CustomerInput } from '../../../../shared/interfaces/customer.interface';

@Component({
  selector: 'app-customer-create-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Add customer</h2>
    <form [formGroup]="form" (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <div class="row g-3">
          <div class="col-6">
            <label for="newCustomerName" class="form-label">FirstName</label>
            <input
              id="newCustomerName"
              class="form-control"
              formControlName="firstName"
              [class.is-invalid]="isInvalid('firstName')"
            />
            <div class="invalid-feedback">First name is required.</div>
          </div>
          <div class="col-sm-6">
            <label for="newCustomerLastName" class="form-label">Last name</label>
            <input
              id="newCustomerLastName"
              class="form-control"
              formControlName="lastName"
              [class.is-invalid]="isInvalid('lastName')"
            />
            <div class="invalid-feedback">Last name is required.</div>
          </div>
          <div class="col-sm-6">
            <label for="newCustomerPhone" class="form-label">Phone</label>
            <input id="newCustomerPhone" type="tel" class="form-control" formControlName="phone" />
          </div>
          <div class="col-sm-6">
            <label for="newCustomerEmail" class="form-label">Email</label>
            <input
              id="newCustomerEmail"
              type="email"
              class="form-control"
              formControlName="email"
              [class.is-invalid]="isInvalid('email')"
            />
            <div class="invalid-feedback">Enter a valid email address.</div>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="saving()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Adding...' : 'Add customer' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CustomerCreateDialogComponent {
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(MatDialogRef<CustomerCreateDialogComponent>);

  readonly saving = signal(false);
  readonly form = this.formBuilder.group({
    firstName: ['', Validators.required],
    lastName: [''],
    phone: [''],
    email: ['', Validators.email],
  });

  isInvalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const customer: CustomerInput = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim(),
      email: value.email.trim(),
    };
    this.dialogRef.close(customer);
  }
}
