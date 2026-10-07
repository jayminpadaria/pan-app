import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Supplier, SupplierInput } from '../../../../shared/interfaces/supplier.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SuppliersService } from '../../../../shared/services/suppliers.service';

@Component({
  selector: 'app-supplier-form',
  standalone: false,
  templateUrl: './supplier-form.component.html',
})
export class SupplierFormComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly loadingSupplier = signal(false);
  readonly isEdit = signal(false);
  private supplierId: string | null = null;

  readonly form = inject(FormBuilder).nonNullable.group({
    companyName: ['', Validators.required],
    contactName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  ngOnInit() {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    if (!this.supplierId) {
      return;
    }

    this.isEdit.set(true);
    this.loadingSupplier.set(true);
    this.suppliersService.getById(this.supplierId).subscribe({
      next: (res) => {
        if (!res.result) {
          this.notification.error('Supplier not found.');
          this.router.navigate(['/app/suppliers']);
          return;
        }

        this.patchSupplier(res.result);
        this.loadingSupplier.set(false);
      },
      error: () => {
        this.notification.error('Failed to load supplier.');
        this.router.navigate(['/app/suppliers']);
      },
    });
  }

  isInvalid(name: 'companyName' | 'contactName' | 'email' | 'phone') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  saveSupplier() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const supplier: SupplierInput = {
      companyName: value.companyName.trim(),
      contactName: value.contactName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
    };
    const request =
      this.isEdit() && this.supplierId
        ? this.suppliersService.update(this.supplierId, supplier)
        : this.suppliersService.create(supplier);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'Supplier updated successfully.' : 'Supplier created successfully.',
        );
        this.router.navigate(['/app/suppliers']);
      },
      error: () => {
        this.notification.error(
          this.isEdit() ? 'Failed to update supplier.' : 'Failed to create supplier.',
        );
        this.saving.set(false);
      },
    });
  }

  private patchSupplier(supplier: Supplier) {
    this.form.patchValue({
      companyName: supplier.companyName,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
    });
  }
}
