import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponseFormat } from '../interfaces/api-response.interface';
import { DailyReport } from '../interfaces/daily-report.interface';
import { DashboardReport } from '../interfaces/dashboard-report.interface';
import { ProfitAndLossReport } from '../interfaces/profit-and-loss.interface';

const API_URL = `${environment.apiUrl}/reports`;

@Injectable({ providedIn: 'root' })
export class DashboardReportService {
  private readonly http = inject(HttpClient);

  getDashboard(date: string) {
    return this.http.post<ApiResponseFormat & { result?: DashboardReport }>(
      `${API_URL}/dashboard`,
      { date },
    );
  }

  downloadDashboard(date: string) {
    return this.http.post(`${API_URL}/dashboard/pdf`, { date }, { responseType: 'blob' });
  }

  getDailyReport(fromDate: string, toDate: string) {
    return this.http.post<ApiResponseFormat & { result?: DailyReport }>(
      `${API_URL}/transactions/date-range`,
      { fromDate, toDate },
    );
  }

  downloadDailyReport(fromDate: string, toDate: string) {
    return this.http.post(
      `${API_URL}/transactions/date-range/pdf`,
      { fromDate, toDate },
      { responseType: 'blob' },
    );
  }

  getProfitAndLoss(fromDate: string, toDate: string) {
    return this.http.post<ApiResponseFormat & { result?: ProfitAndLossReport }>(
      `${API_URL}/profit-loss/date-range`,
      { fromDate, toDate },
    );
  }
}
