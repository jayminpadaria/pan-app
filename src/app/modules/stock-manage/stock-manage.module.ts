import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { StockManageRoutingModule } from './stock-manage-routing.module';
import { Stock } from './pages/stock/stock';

@NgModule({
  imports: [CommonModule, StockManageRoutingModule, Stock],
})
export class StockManageModule {}
