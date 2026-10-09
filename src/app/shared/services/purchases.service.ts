import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import { Purchase } from '../interfaces/purchase.interface';

const API_URL = `${environment.apiUrl}/purchases`;

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Purchase>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: Purchase }>(`${API_URL}/${id}`);
  }

  create(purchase: Omit<Purchase, '_id'>) {
    return this.http.post<ApiResponseFormat>(API_URL, purchase);
  }

  update(id: string, purchase: Omit<Purchase, '_id'>) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, purchase);
  }

  updateStatus(id: string, status: string) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update-status/${id}`, { status });
  }
}
