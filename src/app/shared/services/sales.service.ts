import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import { Sales } from '../interfaces/sales.interface';

const API_URL = `${environment.apiUrl}/sales`;

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Sales>>(`${API_URL}/list`, request);
  }

  create(sale: Omit<Sales, '_id'>) {
    return this.http.post<ApiResponseFormat>(API_URL, sale);
  }

  stock(sku: string, barcode: string) {
    return this.http.get<ApiResponseFormat>(`${API_URL}/stock-lookup`, {
      params: { sku, barcode },
    });
  }
}
