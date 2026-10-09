import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesFormComponent } from './components/sales-form/sales-form.component';
import { Sales } from './pages/sales/sales';

const routes: Routes = [
  { path: '', component: Sales },
  { path: 'create', component: SalesFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesRoutingModule {}
