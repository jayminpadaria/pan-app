import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { allMenu } from '../config/app-menu';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() ? true : inject(Router).createUrlTree(['/signin']);

export const guestGuard: CanActivateFn = () =>
  inject(AuthService).loggedIn() ? inject(Router).createUrlTree(['/app']) : true;

export const roleAccessGuard: CanActivateChildFn = (_route, state) => {
  const role = inject(AuthService).getUserIdentity()?.role?.trim().toLowerCase() ?? 'user';
  const path = state.url.split(/[?#]/)[0];
  const availableMenu = allMenu.filter(
    (item) => item.isEnabled && item.roles.includes(role),
  );
  const hasAccess = availableMenu.some(
    (item) =>
      (path === item.link || path.startsWith(`${item.link}/`)),
  );

  if (hasAccess) {
    return true;
  }

  const fallbackLink = availableMenu[0]?.link;
  return fallbackLink
    ? inject(Router).createUrlTree([fallbackLink])
    : false;
};
