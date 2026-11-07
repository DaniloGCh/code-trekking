import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor (RNF seguridad: token y sesión en peticiones HTTP)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let auth: { currentUser: { getIdToken: jasmine.Spy } | null; signOut: jasmine.Spy };
  let getIdToken: jasmine.Spy;

  const URL_PROPIA = 'https://api.code-trekking.cl/datos';
  const TOKEN = 'token-de-prueba';

  /** Hace la petición y deja que se resuelva el token, que es asíncrono. */
  const pedir = (url: string) => {
    const resultado: { respuesta?: unknown; error?: HttpErrorResponse } = {};
    http.get(url).subscribe({
      next: r => resultado.respuesta = r,
      error: e => resultado.error = e
    });
    flushMicrotasks();
    return resultado;
  };

  beforeEach(() => {
    getIdToken = jasmine.createSpy('getIdToken').and.resolveTo(TOKEN);
    auth = {
      currentUser: { getIdToken },
      signOut: jasmine.createSpy('signOut').and.resolveTo()
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: Auth, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('cabecera Authorization en URLs propias', () => {
    it('debería enviar Authorization: Bearer <token> si hay un usuario con sesión', fakeAsync(() => {
      const resultado = pedir(URL_PROPIA);

      const req = httpMock.expectOne(URL_PROPIA);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);

      req.flush({ ok: true });
      flushMicrotasks();
      expect(resultado.respuesta).toEqual({ ok: true });
    }));

    it('debería enviar la petición sin Authorization si no hay usuario', fakeAsync(() => {
      auth.currentUser = null;

      const resultado = pedir(URL_PROPIA);

      const req = httpMock.expectOne(URL_PROPIA);
      expect(req.request.headers.has('Authorization')).toBeFalse();

      req.flush({ ok: true });
      flushMicrotasks();
      expect(resultado.respuesta).toEqual({ ok: true });
    }));
  });

  describe('errores de respuesta en URLs propias', () => {
    it('debería cerrar sesión, ir a /login y propagar el error ante un 401', fakeAsync(() => {
      const resultado = pedir(URL_PROPIA);

      httpMock.expectOne(URL_PROPIA).flush('No autorizado', { status: 401, statusText: 'Unauthorized' });
      flushMicrotasks();

      expect(auth.signOut).toHaveBeenCalledTimes(1);
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/login', { replaceUrl: true });
      expect(resultado.error?.status).toBe(401);
    }));

    const otrosErrores: [number, string][] = [
      [500, 'Internal Server Error'],
      [404, 'Not Found']
    ];

    otrosErrores.forEach(([status, statusText]) => {
      it(`debería propagar un error ${status} sin cerrar sesión ni redirigir`, fakeAsync(() => {
        const resultado = pedir(URL_PROPIA);

        httpMock.expectOne(URL_PROPIA).flush('Error', { status, statusText });
        flushMicrotasks();

        expect(auth.signOut).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(resultado.error?.status).toBe(status);
      }));
    });
  });

  describe('dominios externos', () => {
    const dominios = [
      'api.openweathermap.org',
      'nominatim.openstreetmap.org',
      'api.openrouteservice.org',
      'tile.openstreetmap.org',
      'tile.thunderforest.com',
      'wikiloc.com'
    ];

    dominios.forEach(dominio => {
      it(`debería dejar pasar ${dominio} sin Authorization y sin pedir el token`, fakeAsync(() => {
        const url = `https://${dominio}/recurso`;

        const resultado = pedir(url);

        const req = httpMock.expectOne(url);
        expect(req.request.headers.has('Authorization')).toBeFalse();
        expect(getIdToken).not.toHaveBeenCalled();

        req.flush({ ok: true });
        flushMicrotasks();
        expect(resultado.respuesta).toEqual({ ok: true });
      }));
    });
  });
});
