import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PurchaseFormComponent } from './components/purchase-form/purchase-form.component';
import { Purchases } from './pages/purchases/purchases';

const routes: Routes = [
  { path: '', component: Purchases },
  { path: 'create', component: PurchaseFormComponent },
  { path: ':id/edit', component: PurchaseFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PurchasesRoutingModule {}
