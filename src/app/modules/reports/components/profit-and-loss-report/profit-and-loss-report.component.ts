import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProfitAndLossReport } from '../../../../shared/interfaces/profit-and-loss.interface';
import { NotificationService } from '../../../../shared/services/notification.service';
import { DashboardReportService } from '../../../../shared/services/dashboard-report.service';

const localDateKey = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const localMonthStart = () => {
  const date = new Date();
  date.setDate(1);
  return localDateKey(date);
};

@Component({
  selector: 'app-profit-and-loss-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './profit-and-loss-report.component.html',
  styleUrl: './profit-and-loss-report.component.scss',
})
export class ProfitAndLossReportComponent implements OnInit {
  private readonly reportService = inject(DashboardReportService);
  private readonly notification = inject(NotificationService);

  readonly startDate = new FormControl(localMonthStart(), { nonNullable: true });
  readonly endDate = new FormControl(localDateKey(new Date()), { nonNullable: true });
  readonly loading = signal(false);
  readonly downloading = signal(false);
  readonly report = signal<ProfitAndLossReport | null>(null);

  ngOnInit() {
    this.generateReport();
  }

  generateReport() {
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
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.report.set(null);
    this.reportService.getProfitAndLoss(fromDate, toDate).subscribe({
      next: (response) => {
        const result = response.result;
        if (!result?.summary || !Array.isArray(result.datewiseEntries)) {
          this.notification.error(
            'The profit and loss response did not include complete report data.',
          );
          this.loading.set(false);
          return;
        }

        this.report.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to generate the profit and loss report.');
        this.loading.set(false);
      },
    });
  }

  formatDay(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }

  downloadReport(fromDate: string, toDate: string) {
    if (this.downloading()) {
      return;
    }

    this.downloading.set(true);
    this.reportService.downloadProfitAndLoss(fromDate, toDate).subscribe({
      next: (pdf) => {
        if (!pdf.size) {
          this.notification.error('The profit and loss PDF was empty.');
          this.downloading.set(false);
          return;
        }

        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = `profit-and-loss-${fromDate}-to-${toDate}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.notification.success('Profit and loss report downloaded successfully.');
        this.downloading.set(false);
      },
      error: () => {
        this.notification.error('Failed to download the profit and loss report.');
        this.downloading.set(false);
      },
    });
  }
}
