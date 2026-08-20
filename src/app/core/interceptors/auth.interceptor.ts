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

  // =========================================================
  // 🌐 DOMINIOS EXTERNOS QUE NO DEBEN LLEVAR EL TOKEN
  // =========================================================
  //
  // Agregarles el header Authorization fuerza un preflight
  // CORS (OPTIONS) que estas APIs de terceros no soportan
  // correctamente, y la petición se cae antes de llegar
  // a pedir el dato real (clima, geocodificación, rutas).
  //
  // Además, el token de Firebase no le sirve de nada a
  // estas APIs: no son tu backend, así que no hay ninguna
  // razón funcional para mandárselo.

  private dominiosExternos = [
    'api.openweathermap.org',
    'nominatim.openstreetmap.org',
    'api.openrouteservice.org',
    'tile.openstreetmap.org',
    'tile.thunderforest.com',
    'wikiloc.com'
  ];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // ✅ Si la petición va a un dominio externo, la dejamos pasar
    //    tal cual, sin tocarle los headers.
    const esExterno = this.dominiosExternos.some(dominio =>
      req.url.includes(dominio)
    );

    if (esExterno) {
      return next.handle(req);
    }

    // ✅ Para el resto de las peticiones (tu propio backend/API,
    //    si en algún momento la tienes), sí agregamos el token.
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