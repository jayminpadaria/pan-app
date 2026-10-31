import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BillOfMaterialsFormComponent } from './components/bill-of-materials-form/bill-of-materials-form.component';
import { BillOfMaterials } from './pages/bom/bom';

const routes: Routes = [
  { path: '', component: BillOfMaterials },
  { path: 'create', component: BillOfMaterialsFormComponent },
  { path: ':id/edit', component: BillOfMaterialsFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BillOfMaterialsRoutingModule {}
