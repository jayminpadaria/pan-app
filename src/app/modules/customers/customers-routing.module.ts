import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerFormComponent } from './components/customer-form/customer-form.component';
import { Customers } from './pages/customers/customers';

const routes: Routes = [
  { path: '', component: Customers },
  { path: 'create', component: CustomerFormComponent },
  { path: ':id/edit', component: CustomerFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomersRoutingModule {}
