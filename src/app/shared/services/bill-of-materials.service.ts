import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ListRequest } from '../interfaces/list.interface';
import { StockLookupResponse } from '../interfaces/product-stock.interface';
import {
  BillOfMaterials,
  BillOfMaterialsInput,
} from '../interfaces/bill-of-materials.interface';

const API_URL = `${environment.apiUrl}/bill-of-materials`;

@Injectable({ providedIn: 'root' })
export class BillOfMaterialsService {
  private readonly http = inject(HttpClient);

  getAll(request: ListRequest) {
    return this.http.post<ApiListResponseFormat<BillOfMaterials>>(`${API_URL}/list`, request);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: BillOfMaterials }>(`${API_URL}/${id}`);
  }

  create(bom: BillOfMaterialsInput) {
    return this.http.post<ApiResponseFormat & { result?: BillOfMaterials }>(API_URL, bom);
  }

  update(id: string, bom: BillOfMaterialsInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, bom);
  }

  print(id: string) {
    return this.http.post<ApiResponseFormat>(`${API_URL}/${id}/print`, null);
  }

  stock(barcode: string, includeZeroStock: boolean = false) {
    return this.http.get<ApiResponseFormat & { result?: StockLookupResponse }>(
      `${API_URL}/stock-lookup`,
      { params: { barcode, includeZeroStock: includeZeroStock.toString() } },
    );
  }
}
