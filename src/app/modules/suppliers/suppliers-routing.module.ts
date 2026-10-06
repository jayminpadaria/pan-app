import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { Suppliers } from './pages/suppliers/suppliers';

const routes: Routes = [
  { path: '', component: Suppliers },
  { path: 'create', component: SupplierFormComponent },
  { path: ':id/edit', component: SupplierFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SuppliersRoutingModule {}
