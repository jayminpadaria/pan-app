import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { Products } from './pages/products/products';

const routes: Routes = [
  { path: '', component: Products },
  { path: 'create', component: ProductFormComponent },
  { path: ':id/edit', component: ProductFormComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProductsRoutingModule {}
