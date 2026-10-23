import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Login } from '../interfaces/login.interface';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
  private refreshRequest: Observable<Login> | null = null;

  // AuthService depends on HttpClient, so it is resolved lazily to avoid a circular dependency.
  constructor(
    private readonly injector: Injector,
    private readonly router: Router,
    private readonly notification: NotificationService,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const auth = this.injector.get(AuthService);
    const isAbsolute = /^https?:\/\//i.test(req.url);

    if (isAbsolute && !req.url.startsWith(environment.apiUrl)) {
      return next.handle(req);
    }

    const url = isAbsolute ? req.url : environment.apiUrl + req.url.trim();
    const token = auth.getToken();
    const authReq = req.clone({
      url,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return next.handle(authReq).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const isLoginCall = url.endsWith('/auth/login');
          const isRefreshCall = url.endsWith('/auth/refresh-token');
          if (isLoginCall || isRefreshCall) return throwError(() => error);

          switch (error.status) {
            case 401:
              return this.refreshAndRetry(auth, authReq, next);
            case 403:
              this.notification.error('You do not have permission to perform this action.');
              break;
            case 511:
              this.logoutUser(auth);
              break;
          }
        }
        return throwError(() => error);
      }),
    );
  }

  private refreshAndRetry(
    auth: AuthService,
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return this.getRefreshRequest(auth).pipe(
      switchMap((identity) =>
        next.handle(
          request.clone({
            setHeaders: { Authorization: `Bearer ${identity.token}` },
          }),
        ),
      ),
      catchError((error: unknown) => {
        this.logoutUser(auth);
        return throwError(() => error);
      }),
    );
  }

  private getRefreshRequest(auth: AuthService): Observable<Login> {
    if (!this.refreshRequest) {
      this.refreshRequest = auth.refreshToken().pipe(
        finalize(() => {
          this.refreshRequest = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.refreshRequest;
  }

  private logoutUser(auth: AuthService) {
    auth.logout();
    this.notification.error('Session expired. Please sign in again.');
    this.router.navigateByUrl('/signin');
  }
}
