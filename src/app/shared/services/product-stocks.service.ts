import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponseFormat } from '../interfaces/api-response.interface';
import { ProductStock } from '../interfaces/product-stock.interface';

const API_URL = `${environment.apiUrl}/stock`;

@Injectable({ providedIn: 'root' })
export class ProductStocksService {
  private readonly http = inject(HttpClient);

  getByBarcode(barcode: string) {
    return this.http.get<ApiResponseFormat & { result?: ProductStock }>(
      `${API_URL}/${encodeURIComponent(barcode)}`,
    );
  }
}
