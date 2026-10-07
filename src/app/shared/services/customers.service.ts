import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { Customer, CustomerInput } from '../interfaces/customer.interface';
import { ListRequest } from '../interfaces/list.interface';

const API_URL = `${environment.apiUrl}/customers`;

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Customer>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: Customer }>(`${API_URL}/${id}`);
  }

  create(customer: CustomerInput) {
    return this.http.post<ApiResponseFormat>(API_URL, customer);
  }

  update(id: string, customer: CustomerInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, customer);
  }
}
