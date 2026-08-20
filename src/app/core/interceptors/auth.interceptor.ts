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
    return from(this.getToken()).pipe(
      switchMap(token => {
        // ✅ Agregar token a cada request
        const authReq = token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req;

        return next.handle(authReq).pipe(
          catchError((error: HttpErrorResponse) => {
            // ✅ Si token expirado, redirigir al login
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
    return user.getIdToken(true); // ✅ Forzar refresh del token
  }
}
