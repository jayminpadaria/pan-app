import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthRouteComponent } from './components/auth-route/auth-route.component';
import { RootComponent } from './components/root/root.component';
import { authGuard, guestGuard } from './shared/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: RootComponent,
    children: [
      { path: '', redirectTo: 'signin', pathMatch: 'full' },
      {
        path: 'signin',
        canActivate: [guestGuard],
        loadChildren: () => import('./modules/login/login.module').then((m) => m.LoginModule),
      },
    ],
  },
  {
    path: 'app',
    component: AuthRouteComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'users',
        loadChildren: () => import('./modules/users/users.module').then((m) => m.UsersModule),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
