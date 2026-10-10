import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReportsRoutingModule } from './reports-routing.module';
import { Reports } from './pages/reports/reports';

@NgModule({
  imports: [CommonModule, ReportsRoutingModule, Reports],
})
export class ReportsModule {}
