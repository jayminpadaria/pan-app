import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import { StockLookupResponse } from '../interfaces/product-stock.interface';
import { Sales } from '../interfaces/sales.interface';

const API_URL = `${environment.apiUrl}/sales`;

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Sales>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: Sales }>(`${API_URL}/${id}`);
  }

  create(sale: Omit<Sales, '_id'>) {
    return this.http.post<ApiResponseFormat>(API_URL, sale);
  }

  update(id: string, sale: Omit<Sales, '_id'>) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, sale);
  }

  stock(barcode: string) {
    return this.http.get<ApiResponseFormat & { result?: StockLookupResponse }>(
      `${API_URL}/stock-lookup`,
      { params: { barcode } },
    );
  }
}
