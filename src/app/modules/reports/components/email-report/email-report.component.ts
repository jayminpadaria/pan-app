import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DashboardReportService } from '../../../../shared/services/dashboard-report.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { REPORT_NAME } from '../../../../shared/interfaces/report-name.enum';

const localToday = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

@Component({
  selector: 'app-email-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './email-report.component.html',
})
export class EmailReportComponent {
  private readonly reportService = inject(DashboardReportService);
  private readonly notification = inject(NotificationService);

  readonly reportOptions = [
    { value: REPORT_NAME.DASHBOARD, label: 'Dashboard' },
    { value: REPORT_NAME.TRANSACTIONS, label: 'Transactions' },
    { value: REPORT_NAME.PROFIT_LOSS, label: 'Profit & Loss' },
    { value: REPORT_NAME.ALL, label: 'All Reports' },
  ];
  readonly reportName = new FormControl(REPORT_NAME.ALL, { nonNullable: true });
  readonly startDate = new FormControl(localToday(), { nonNullable: true });
  readonly endDate = new FormControl(localToday(), { nonNullable: true });
  readonly sending = signal(false);

  emailReport() {
    const fromDate = this.startDate.value;
    const toDate = this.endDate.value;
    if (!fromDate || !toDate) {
      this.notification.error('Select both a start date and an end date.');
      return;
    }
    if (fromDate > toDate) {
      this.notification.error('The start date must be on or before the end date.');
      return;
    }
    if (this.sending()) {
      return;
    }

    this.sending.set(true);
    this.reportService.emailReport(this.reportName.value, fromDate, toDate).subscribe({
      next: () => {
        this.notification.success('Email report sent successfully.');
        this.sending.set(false);
      },
      error: () => {
        this.notification.error('Failed to send the email report.');
        this.sending.set(false);
      },
    });
  }
}
