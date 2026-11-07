import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { authGuard } from './auth.guard';

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

describe('authGuard (RNF seguridad: acceso solo con sesión)', () => {
  let fake: ReturnType<typeof crearAuthFalso>;
  let router: jasmine.SpyObj<Router>;

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as Promise<boolean>;

  beforeEach(() => {
    fake = crearAuthFalso();
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: fake.auth },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('debería permitir el acceso si hay un usuario autenticado', fakeAsync(() => {
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir({ uid: 'u1' });
    flush();

    expect(resultado).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));

  it('debería redirigir a /login si no hay sesión', fakeAsync(() => {
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    fake.emitir(null);
    flush();

    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  }));

  it('debería dejar de escuchar el estado de sesión tras la primera respuesta', fakeAsync(() => {
    ejecutar();
    fake.emitir({ uid: 'u1' });
    flush();

    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  }));

  it('debería redirigir a /login si Firebase no responde en 10 segundos', fakeAsync(() => {
    let resultado: boolean | undefined;
    ejecutar().then(r => resultado = r);

    tick(9999);
    expect(resultado).toBeUndefined();

    tick(1);
    expect(resultado).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    flush();
  }));

  it('debería cancelar el timeout si Firebase responde a tiempo', fakeAsync(() => {
    ejecutar();
    tick(5000);
    fake.emitir({ uid: 'u1' });
    tick(10000);

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    flush();
  }));
});
