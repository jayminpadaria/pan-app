import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { Category, CategoryInput } from '../interfaces/category.interface';
import { ListRequest } from '../interfaces/list.interface';

const API_URL = `${environment.apiUrl}/categories`;

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Category>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: Category }>(`${API_URL}/${id}`);
  }

  create(category: CategoryInput) {
    return this.http.post<ApiResponseFormat>(API_URL, category);
  }

  update(id: string, category: CategoryInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, category);
  }
}
