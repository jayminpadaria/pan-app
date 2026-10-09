import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { SalesViewComponent } from './components/sales-view/sales-view.component';
import { Sales } from './pages/sales/sales';

const routes: Routes = [
  { path: '', component: Sales },
  { path: 'create', component: SalesFormComponent },
  { path: ':id/view', component: SalesViewComponent },
  { path: ':id/edit', component: SalesFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesRoutingModule {}
