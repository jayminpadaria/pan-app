import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() ? true : inject(Router).createUrlTree(['/signin']);

export const guestGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() ? inject(Router).createUrlTree(['/app']) : true;
