import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ListRequest } from '../interfaces/list.interface';
import { ApiListResponseFormat, ApiResponseFormat } from '../interfaces/api-response.interface';
import { ChangeUserPasswordInput, User, UserInput } from '../interfaces/user.interface';

const API_URL = `${environment.apiUrl}/users`;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getAll(reqObj: ListRequest) {
    return this.http.post<ApiListResponseFormat<User>>(`${API_URL}/list`, reqObj);
  }

  getById(id: string) {
    return this.http.get<ApiResponseFormat & { result?: User }>(`${API_URL}/${id}`);
  }

  create(user: UserInput) {
    return this.http.post<ApiResponseFormat>(API_URL, user);
  }

  update(id: string, user: UserInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/update/${id}`, user);
  }

  changePassword(id: string, passwords: ChangeUserPasswordInput) {
    return this.http.put<ApiResponseFormat>(`${API_URL}/change/password/${id}`, passwords);
  }
}
