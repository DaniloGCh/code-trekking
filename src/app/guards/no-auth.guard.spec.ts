import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { noAuthGuard } from './no-auth.guard';
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

describe('noAuthGuard (login/registro solo sin sesión)', () => {
  let fake: ReturnType<typeof crearAuthFalso>;
  let router: jasmine.SpyObj<Router>;
  let authService: jasmine.SpyObj<AuthService>;

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => noAuthGuard({} as any, {} as any)) as Promise<boolean>;

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

  it('debería permitir entrar a login si no hay sesión', fakeAsync(() => {
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir(null);
    flush();

    expect(resultado).toBeTrue();
    expect(authService.getUserRole).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));

  it('debería redirigir al administrador con sesión a /dashboard', fakeAsync(() => {
    authService.getUserRole.and.resolveTo('admin');
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'admin1' });
    flush();

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
  }));

  it('debería redirigir al usuario con sesión a /tabs/home', fakeAsync(() => {
    authService.getUserRole.and.resolveTo('user');
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'u1' });
    flush();

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  }));

  it('debería dejar de escuchar el estado de sesión tras la primera respuesta', fakeAsync(() => {
    ejecutar();
    fake.emitir(null);
    flush();

    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  }));
});
