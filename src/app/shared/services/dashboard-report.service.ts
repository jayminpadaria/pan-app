import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponseFormat } from '../interfaces/api-response.interface';
import { DashboardReport } from '../interfaces/dashboard-report.interface';

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
}
