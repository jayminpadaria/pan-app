import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Stock } from './pages/stock/stock';

const routes: Routes = [{ path: '', component: Stock }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StockManageRoutingModule {}
