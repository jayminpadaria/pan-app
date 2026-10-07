import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Customer, CustomerInput } from '../../../../shared/interfaces/customer.interface';
import { CustomersService } from '../../../../shared/services/customers.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-customer-form',
  standalone: false,
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent implements OnInit {
  private readonly customersService = inject(CustomersService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly loadingCustomer = signal(false);
  readonly isEdit = signal(false);
  private customerId: string | null = null;

  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.email]],
    phone: [''],
  });

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (!this.customerId) {
      return;
    }

    this.isEdit.set(true);
    this.loadingCustomer.set(true);
    this.customersService.getById(this.customerId).subscribe({
      next: (res) => {
        if (!res.result) {
          this.notification.error('Customer not found.');
          this.router.navigate(['/app/customers']);
          return;
        }

        this.patchCustomer(res.result);
        this.loadingCustomer.set(false);
      },
      error: () => {
        this.notification.error('Failed to load customer.');
        this.router.navigate(['/app/customers']);
      },
    });
  }

  isInvalid(name: 'firstName' | 'lastName' | 'email' | 'phone') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  saveCustomer() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const customer: CustomerInput = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
    };
    const request =
      this.isEdit() && this.customerId
        ? this.customersService.update(this.customerId, customer)
        : this.customersService.create(customer);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'Customer updated successfully.' : 'Customer created successfully.',
        );
        this.router.navigate(['/app/customers']);
      },
      error: () => {
        this.notification.error(
          this.isEdit() ? 'Failed to update customer.' : 'Failed to create customer.',
        );
        this.saving.set(false);
      },
    });
  }

  private patchCustomer(customer: Customer) {
    this.form.patchValue({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
    });
  }
}
