import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DailyReportsComponent } from './components/daily-reports/daily-reports.component';
import { DailyStockReportComponent } from './components/daily-stock-report/daily-stock-report.component';
import { EmailReportComponent } from './components/email-report/email-report.component';
import { ProfitAndLossReportComponent } from './components/profit-and-loss-report/profit-and-loss-report.component';
import { reportTabAccessGuard } from './report-tab.guard';
import { Reports } from './pages/reports/reports';

const routes: Routes = [
  {
    path: '',
    component: Reports,
    children: [
      { path: '', redirectTo: 'daily-transactions', pathMatch: 'full' },
      {
        path: 'daily-transactions',
        component: DailyReportsComponent,
        canActivate: [reportTabAccessGuard],
      },
      {
        path: 'daily-stock',
        component: DailyStockReportComponent,
        canActivate: [reportTabAccessGuard],
      },
      {
        path: 'profit-and-loss',
        component: ProfitAndLossReportComponent,
        canActivate: [reportTabAccessGuard],
      },
      { path: 'email', component: EmailReportComponent, canActivate: [reportTabAccessGuard] },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}
