import { Component } from '@angular/core';
import { DailyReportsComponent } from '../../components/daily-reports/daily-reports.component';

@Component({
  imports: [DailyReportsComponent],
  selector: 'app-reports',
  standalone: true,
  templateUrl: './reports.html',
})
export class Reports {}
