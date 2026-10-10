import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';

@NgModule({
  declarations: [DashboardComponent],
  imports: [CommonModule, MatProgressBarModule, DashboardRoutingModule],
})
export class DashboardModule {}
