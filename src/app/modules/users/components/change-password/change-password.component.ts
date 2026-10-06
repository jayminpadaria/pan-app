import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeUserPasswordInput } from '../../../../shared/interfaces/user.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { UsersService } from '../../../../shared/services/users.service';
import {
  PASSWORD_COMPLEXITY_PATTERN,
  PASSWORD_MIN_LENGTH,
} from '../../../../shared/validators/password.validators';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('newPassword')?.value === control.get('confirmPassword')?.value
    ? null
    : { passwordsMismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: false,
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  private userId: string | null = null;
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.pattern(PASSWORD_COMPLEXITY_PATTERN),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (!this.userId) {
      this.notification.error('Unable to identify the user.');
      this.router.navigate(['/app/users']);
    }
  }

  isInvalid(name: 'oldPassword' | 'newPassword' | 'confirmPassword') {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  isConfirmPasswordInvalid() {
    const control = this.form.controls.confirmPassword;
    return (
      (control.dirty || control.touched) &&
      (control.invalid || this.form.hasError('passwordsMismatch'))
    );
  }

  changePassword() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.userId) {
      this.notification.error('Unable to identify the user.');
      return;
    }

    const { oldPassword, newPassword } = this.form.getRawValue();
    const passwords: ChangeUserPasswordInput = { oldPassword, newPassword };
    this.saving.set(true);
    this.usersService.changePassword(this.userId, passwords).subscribe({
      next: () => {
        this.notification.success('Password changed successfully.');
        this.router.navigate(['/app/users']);
      },
      error: () => {
        this.notification.error('Failed to change password.');
        this.saving.set(false);
      },
    });
  }
}
