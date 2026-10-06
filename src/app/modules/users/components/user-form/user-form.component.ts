import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserInput } from '../../../../shared/interfaces/user.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { UsersService } from '../../../../shared/services/users.service';
import {
  PASSWORD_COMPLEXITY_PATTERN,
  PASSWORD_MIN_LENGTH,
} from '../../../../shared/validators/password.validators';

@Component({
  selector: 'app-user-form',
  standalone: false,
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly loadingUser = signal(false);
  readonly isEdit = signal(false);
  private userId: string | null = null;
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    primaryEmail: ['', [Validators.required, Validators.email]],
    secondaryEmail: ['', Validators.email],
    primaryPhone: ['', Validators.required],
    secondaryPhone: [''],
    password: [
      '',
      [
        Validators.minLength(PASSWORD_MIN_LENGTH),
        Validators.pattern(PASSWORD_COMPLEXITY_PATTERN),
      ],
    ],
    role: ['user', Validators.required],
    notes: [''],
  });

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (!this.userId) {
      this.form.controls.password.addValidators(Validators.required);
      this.form.controls.password.updateValueAndValidity();
      return;
    }

    this.isEdit.set(true);
    this.form.controls.primaryEmail.disable();
    this.form.controls.primaryPhone.disable();
    this.form.controls.password.disable();
    this.form.controls.password.setValue('********');
    this.loadingUser.set(true);
    this.usersService.getById(this.userId).subscribe({
      next: (res) => {
        if (!res.result) {
          this.notification.error('User not found.');
          this.router.navigate(['/app/users']);
          return;
        }
        this.form.patchValue(res.result);
        this.loadingUser.set(false);
      },
      error: () => {
        this.notification.error('Failed to load user.');
        this.router.navigate(['/app/users']);
      },
    });
  }

  isInvalid(name: string) {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  saveUser() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, ...profile } = this.form.getRawValue();
    const user: UserInput = password && !this.isEdit() ? { ...profile, password } : profile;
    const request =
      this.isEdit() && this.userId
        ? this.usersService.update(this.userId, user)
        : this.usersService.create(user);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notification.success(
          this.isEdit() ? 'User updated successfully.' : 'User created successfully.',
        );
        this.router.navigate(['/app/users']);
      },
      error: () => {
        this.notification.error(
          this.isEdit() ? 'Failed to update user.' : 'Failed to create user.',
        );
        this.saving.set(false);
      },
    });
  }
}
