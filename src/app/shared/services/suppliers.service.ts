import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import { Supplier, SupplierInput } from '../interfaces/supplier.interface';

const API_URL = `${environment.apiUrl}/suppliers`;

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Supplier>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: Supplier }>(`${API_URL}/${id}`);
  }

  create(supplier: SupplierInput) {
    return this.http.post<ApiResponseFormat>(API_URL, supplier);
  }

  update(id: string, supplier: SupplierInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, supplier);
  }
}
