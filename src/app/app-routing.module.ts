import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthRouteComponent } from './components/auth-route/auth-route.component';
import { RootComponent } from './components/root/root.component';
import { authGuard, guestGuard, roleAccessGuard } from './shared/guards/auth.guard';

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
    canActivateChild: [roleAccessGuard],
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
      {
        path: 'products',
        loadChildren: () =>
          import('./modules/products/products.module').then((m) => m.ProductsModule),
      },
      {
        path: 'purchases',
        loadChildren: () =>
          import('./modules/purchases/purchases.module').then((m) => m.PurchasesModule),
      },
      {
        path: 'sales',
        loadChildren: () => import('./modules/sales/sales.module').then((m) => m.SalesModule),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./modules/reports/reports.module').then((m) => m.ReportsModule),
      },
      {
        path: 'categories',
        loadChildren: () =>
          import('./modules/categories/categories.module').then((m) => m.CategoriesModule),
      },
      {
        path: 'suppliers',
        loadChildren: () =>
          import('./modules/suppliers/suppliers.module').then((m) => m.SuppliersModule),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./modules/customers/customers.module').then((m) => m.CustomersModule),
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
