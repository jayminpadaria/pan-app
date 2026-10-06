import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
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
          switch (error.status) {
            case 401:
              if (!isLoginCall) this.logoutUser(auth);
              break;
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

  private logoutUser(auth: AuthService) {
    auth.logout();
    this.notification.error('Session expired. Please sign in again.');
    this.router.navigateByUrl('/signin');
  }
}
