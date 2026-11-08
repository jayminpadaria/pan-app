import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import { SalesReturn } from '../interfaces/sales-return.interface';

const API_URL = `${environment.apiUrl}/sales-returns`;

@Injectable({ providedIn: 'root' })
export class SalesReturnService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<SalesReturn>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: SalesReturn }>(`${API_URL}/${id}`);
  }

  create(sale: Omit<SalesReturn, '_id'>) {
    return this.http.post<ApiResponseFormat & { result?: SalesReturn }>(API_URL, sale);
  }

  delete(id: string) {
    return this.http.delete<ApiResponseFormat>(`${API_URL}/${id}`);
  }
}
