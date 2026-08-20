// src/app/core/interceptors/auth.interceptor.ts

import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private auth = inject(Auth);
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 1. Si la petición es para OpenWeatherMap, dejarla pasar limpia sin token
    if (req.url.includes('openweathermap.org')) {
      return next.handle(req);
    }

    // 2. Para el resto de peticiones (tu propia API / Firebase), adjuntar token
    return from(this.getToken()).pipe(
      switchMap(token => {
        const authReq = token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req;

        return next.handle(authReq).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              this.auth.signOut();
              this.router.navigateByUrl('/login', { replaceUrl: true });
            }
            return throwError(() => error);
          })
        );
      })
    );
  }

  private async getToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return user.getIdToken(true);
  }
}