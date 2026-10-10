import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import {
  Product,
  ProductInput,
  ProductVariant,
  ProductVariantInput,
} from '../interfaces/product.interface';

const API_URL = `${environment.apiUrl}/products`;

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<Product>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: Product }>(`${API_URL}/${id}`);
  }

  create(product: ProductInput) {
    return this.http.post<ApiResponseFormat>(API_URL, product);
  }

  update(id: string, product: ProductInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, product);
  }

  getVariants(id: string) {
    return this.http.get<ApiListResponseFormat<ProductVariant>>(`${API_URL}/${id}/variants/list`);
  }

  updateVariant(id: string, variantId: string, variant: ProductVariantInput) {
    return this.http.put<ApiResponseFormat>(
      `${API_URL}/${id}/update/variant/${variantId}`,
      variant,
    );
  }

  addVariant(id: string, variant: ProductVariantInput) {
    return this.http.post<ApiResponseFormat>(`${API_URL}/${id}/add/variant`, variant);
  }

  removeVariant(id: string, variantId: string) {
    return this.http.delete<ApiResponseFormat>(`${API_URL}/${id}/remove/variant/${variantId}`);
  }

  printVariantLabel(
    variantId: string,
    label: { batchNumber: string; mfdDate: string },
  ) {
    return this.http.post<ApiResponseFormat>(
      `${API_URL}/variants/${variantId}/print-label`,
      label,
    );
  }
}
