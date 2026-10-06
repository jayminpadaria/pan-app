import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AuthRouteComponent } from './components/auth-route/auth-route.component';
import { RootComponent } from './components/root/root.component';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { HttpInterceptorService } from './shared/interceptors/http-interceptor.service';

@NgModule({
  declarations: [AppComponent, AuthRouteComponent, RootComponent],
  imports: [BrowserModule, AppRoutingModule, NgbModule, SharedModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
