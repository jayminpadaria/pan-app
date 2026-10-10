import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { interval } from 'rxjs';
import { DashboardReport } from '../../../shared/interfaces/dashboard-report.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { DashboardReportService } from '../../../shared/services/dashboard-report.service';

const localDateKey = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardReportService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly now = signal(new Date());
  readonly requestedDate = signal(localDateKey(new Date()));
  readonly loading = signal(false);
  readonly dashboard = signal<DashboardReport | null>(null);

  ngOnInit() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const currentTime = new Date();
        this.now.set(currentTime);
        const currentDate = localDateKey(currentTime);
        if (currentDate !== this.requestedDate()) {
          this.requestedDate.set(currentDate);
          this.loadDashboard();
        }
      });
    this.loadDashboard();
  }

  loadDashboard() {
    const date = this.requestedDate();
    this.loading.set(true);
    this.dashboard.set(null);
    this.dashboardService.getDashboard(date).subscribe({
      next: (response) => {
        const result = response.result;
        if (
          !result?.sales ||
          !result.purchases ||
          !Array.isArray(result.stock?.groups) ||
          !result.stock?.totals
        ) {
          this.notification.error('The dashboard response did not include complete report data.');
          this.loading.set(false);
          return;
        }
        this.dashboard.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error("Couldn't load today's dashboard data.");
        this.loading.set(false);
      },
    });
  }
}
