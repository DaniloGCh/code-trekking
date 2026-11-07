import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { adminGuard } from './admin.guard';
import { AuthService } from 'src/app/core/services/auth.service';

/** Auth falso: guarda el listener para emitir el usuario cuando la prueba lo indique. */
function crearAuthFalso() {
  let listener: ((user: any) => void) | null = null;
  const unsubscribe = jasmine.createSpy('unsubscribe');
  const auth = {
    onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.callFake((cb: any) => {
      listener = cb;
      return unsubscribe;
    })
  };
  return { auth, unsubscribe, emitir: (user: any) => listener!(user) };
}

describe('adminGuard (RNF seguridad: control de acceso por rol)', () => {
  let fake: ReturnType<typeof crearAuthFalso>;
  let router: jasmine.SpyObj<Router>;
  let authService: jasmine.SpyObj<AuthService>;

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any)) as Promise<boolean>;

  beforeEach(() => {
    fake = crearAuthFalso();
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getUserRole']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: fake.auth },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService }
      ]
    });
  });

  it('debería permitir el acceso a un usuario con rol admin', fakeAsync(() => {
    authService.getUserRole.and.resolveTo('admin');
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'admin1' });
    flush();

    expect(resultado).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));

  it('debería redirigir a /tabs/home a un usuario sin rol admin', fakeAsync(() => {
    authService.getUserRole.and.resolveTo('user');
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'u1' });
    flush();

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  }));

  it('debería redirigir a /tabs/home si el usuario no tiene documento (rol null)', fakeAsync(() => {
    authService.getUserRole.and.resolveTo(null);
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'u1' });
    flush();

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  }));

  it('debería redirigir a /login si no hay sesión, sin consultar el rol', fakeAsync(() => {
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir(null);
    flush();

    expect(resultado).toBeFalse();
    expect(authService.getUserRole).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  }));

  it('debería redirigir a /login si falla la consulta del rol', fakeAsync(() => {
    spyOn(console, 'error');
    authService.getUserRole.and.rejectWith(new Error('unavailable'));
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'u1' });
    flush();

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  }));

  it('debería redirigir a /login si Firebase no responde en 10 segundos', fakeAsync(() => {
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    tick(10000);

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    flush();
  }));
});
