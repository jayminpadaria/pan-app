import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { REPORT_TABS } from './report-tabs';

export const reportTabAccessGuard: CanActivateFn = (route) => {
  const role = inject(AuthService).getUserIdentity()?.role?.trim().toLowerCase() ?? 'user';
  const router = inject(Router);
  const currentTab = REPORT_TABS.find((tab) => tab.path === route.routeConfig?.path);

  if (currentTab?.roles.includes(role)) {
    return true;
  }

  const fallbackTab = REPORT_TABS.find((tab) => tab.roles.includes(role));
  return fallbackTab
    ? router.createUrlTree(['/app/reports', fallbackTab.path])
    : router.createUrlTree(['/app']);
};
