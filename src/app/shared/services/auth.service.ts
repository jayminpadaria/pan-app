import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponseFormat } from '../interfaces/api-response.interface';
import { Login } from '../interfaces/login.interface';

export interface LoginRequest {
  username: string;
  password: string;
}

const AUTH_KEY = 'identity';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _loggedIn = signal(localStorage.getItem(AUTH_KEY) !== null);
  readonly loggedIn = this._loggedIn.asReadonly();

  login(credentials: LoginRequest) {
    return this.http.post<ApiResponseFormat>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        localStorage.setItem(AUTH_KEY, JSON.stringify(response.result));
        this._loggedIn.set(true);
      }),
    );
  }

  refreshToken() {
    const refreshToken = this.getReferenceToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token is available.'));
    }

    return this.http
      .post<ApiResponseFormat>(`${environment.apiUrl}/auth/refresh-token`, { token: refreshToken })
      .pipe(
        map((response) => {
          const currentIdentity = this.getUserIdentity();
          const result = response.result;
          if (
            !currentIdentity ||
            !result ||
            typeof result !== 'object' ||
            !('token' in result) ||
            typeof result.token !== 'string' ||
            !result.token
          ) {
            throw new Error('The refresh-token response did not contain a valid token.');
          }

          const identity: Login = {
            ...currentIdentity,
            token: result.token,
            refreshToken:
              'refreshToken' in result && typeof result.refreshToken === 'string'
                ? result.refreshToken
                : currentIdentity.refreshToken,
          };
          console.log('Refreshed identity:', identity);
          localStorage.setItem(AUTH_KEY, JSON.stringify(identity));
          return identity;
        }),
      );
  }

  logout() {
    localStorage.removeItem(AUTH_KEY);
    this._loggedIn.set(false);
  }

  getToken(): string | null {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      const identity: Login = JSON.parse(raw);
      return identity?.token ?? null;
    } catch {
      return null;
    }
  }

  getReferenceToken(): string | null {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      const identity: Login = JSON.parse(raw);
      return identity?.refreshToken ?? null;
    } catch {
      return null;
    }
  }

  getUserIdentity(): Login | null {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      const identity: Login = JSON.parse(raw);
      return identity ?? null;
    } catch {
      return null;
    }
  }
}
