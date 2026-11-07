import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

import { TerminosControlService } from './terminos-control.service';
import { AuthService, SuscripcionData, UserData } from './auth.service';
import { TerminosService, TerminosVigentes } from './terminos.service';

describe('TerminosControlService (re-aceptación de términos)', () => {
  let service: TerminosControlService;
  let terminosService: TerminosService;
  let authService: jasmine.SpyObj<AuthService>;
  let modalCtrl: jasmine.SpyObj<ModalController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let router: jasmine.SpyObj<Router>;
  let auth: { currentUser: { uid: string } | null };
  let modal: { present: jasmine.Spy; onDidDismiss: jasmine.Spy };
  let toast: { present: jasmine.Spy };

  const VIGENTES: TerminosVigentes = { version: '1.1', fechaPublicacion: '2026-01-01T00:00:00Z' };
  const SUB_ACTIVA = { activa: true } as SuscripcionData;
  const SUB_VENCIDA = { activa: false } as SuscripcionData;

  const usuario = (datos: Partial<UserData>): UserData =>
    ({ uid: 'u1', email: 'u1@mail.cl', nombre: 'Ana', rol: 'user', ...datos } as UserData);

  const USUARIO_DESACTUALIZADO = usuario({ terminosAceptados: true, versionTerminos: '1.0' });
  const USUARIO_AL_DIA = usuario({ terminosAceptados: true, versionTerminos: '1.1' });
  const ADMIN = usuario({ rol: 'admin' });

  /** El modal se "cierra" con el rol/datos indicados. */
  const cerrarModalCon = (role?: string, data?: any) =>
    modal.onDidDismiss.and.resolveTo({ role, data });

  beforeEach(() => {
    auth = { currentUser: { uid: 'u1' } };
    modal = {
      present: jasmine.createSpy('present').and.resolveTo(),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'aceptado' })
    };
    toast = { present: jasmine.createSpy('present').and.resolveTo() };

    modalCtrl = jasmine.createSpyObj<ModalController>('ModalController', ['create']);
    modalCtrl.create.and.resolveTo(modal as any);
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo(toast as any);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    authService = jasmine.createSpyObj<AuthService>('AuthService',
      ['getCurrentUserData', 'verificarYActualizarSuscripcion', 'logout']);
    authService.verificarYActualizarSuscripcion.and.resolveTo(SUB_VENCIDA);
    authService.logout.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        // TerminosService real (lógica de versiones), sin Firebase
        { provide: Auth, useValue: auth },
        { provide: Firestore, useValue: {} },
        { provide: Router, useValue: router },
        { provide: ModalController, useValue: modalCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: AuthService, useValue: authService }
      ]
    });

    terminosService = TestBed.inject(TerminosService);
    spyOn(terminosService, 'obtenerVigentes').and.resolveTo(VIGENTES);
    service = TestBed.inject(TerminosControlService);
  });

  afterEach(() => {
    try { jasmine.clock().uninstall(); } catch { /* no estaba instalado */ }
  });

  // =========================
  // 📊 ESTADO
  // =========================
  describe('obtenerEstado', () => {
    it('debería devolver null si el usuario aún no tiene documento', async () => {
      authService.getCurrentUserData.and.resolveTo(null);
      expect(await service.obtenerEstado()).toBeNull();
    });

    it('debería considerar al día a quien aceptó la versión vigente, sin consultar el pago', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_AL_DIA);
      const estado = await service.obtenerEstado();

      expect(estado).toEqual({ vigentes: VIGENTES, exento: false, alDia: true, pagoVigente: false });
      expect(authService.verificarYActualizarSuscripcion).not.toHaveBeenCalled();
    });

    it('debería eximir al administrador aunque no haya aceptado', async () => {
      authService.getCurrentUserData.and.resolveTo(ADMIN);
      const estado = await service.obtenerEstado();

      expect(estado?.exento).toBeTrue();
      expect(estado?.alDia).toBeTrue();
      expect(authService.verificarYActualizarSuscripcion).not.toHaveBeenCalled();
    });

    it('debería marcar desactualizado y sin pago vigente a quien aceptó una versión anterior', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      const estado = await service.obtenerEstado();

      expect(estado?.alDia).toBeFalse();
      expect(estado?.pagoVigente).toBeFalse();
    });

    it('debería detectar pago vigente cuando la suscripción está activa', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      authService.verificarYActualizarSuscripcion.and.resolveTo(SUB_ACTIVA);

      expect((await service.obtenerEstado())?.pagoVigente).toBeTrue();
    });
  });

  // =========================
  // 🧭 VERIFICACIÓN AL NAVEGAR
  // =========================
  describe('verificarAlNavegar', () => {
    it('debería no hacer nada si no hay sesión', async () => {
      auth.currentUser = null;
      await service.verificarAlNavegar('/tabs/home');
      expect(authService.getCurrentUserData).not.toHaveBeenCalled();
    });

    it('debería no interrumpir en login, registro ni pantalla de error', async () => {
      for (const url of ['/login', '/register?ref=x', '/error', '/error/detalle']) {
        await service.verificarAlNavegar(url);
      }
      expect(authService.getCurrentUserData).not.toHaveBeenCalled();
    });

    it('debería bloquear con un modal obligatorio si no tiene pago vigente', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);

      await service.verificarAlNavegar('/tabs/home');

      expect(modalCtrl.create).toHaveBeenCalledTimes(1);
      const opciones = modalCtrl.create.calls.mostRecent().args[0] as any;
      expect(opciones.componentProps.modo).toBe('obligatorio');
      expect(opciones.backdropDismiss).toBeFalse();
      expect(opciones.keyboardClose).toBeFalse();
      expect(modal.present).toHaveBeenCalled();
      expect(toastCtrl.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
    });

    it('debería permitir cerrar el modal obligatorio solo aceptando o cerrando sesión', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      await service.verificarAlNavegar('/tabs/home');

      const canDismiss = (modalCtrl.create.calls.mostRecent().args[0] as any).canDismiss;
      expect(await canDismiss(undefined, 'aceptado')).toBeTrue();
      expect(await canDismiss(undefined, 'logout')).toBeTrue();
      expect(await canDismiss(undefined, 'backdrop')).toBeFalse();
      expect(await canDismiss(undefined, 'gesture')).toBeFalse();
      expect(await canDismiss(undefined, undefined)).toBeFalse();
    });

    it('debería cerrar sesión y volver a /login si elige salir en el modal obligatorio', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      cerrarModalCon('logout');

      await service.verificarAlNavegar('/tabs/home');

      expect(authService.logout).toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    });

    it('debería mostrar solo un aviso no bloqueante si tiene pago vigente', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      authService.verificarYActualizarSuscripcion.and.resolveTo(SUB_ACTIVA);

      await service.verificarAlNavegar('/tabs/home');

      expect(modalCtrl.create).not.toHaveBeenCalled();
      expect(toastCtrl.create).toHaveBeenCalledTimes(1);
      const opciones = toastCtrl.create.calls.mostRecent().args[0] as any;
      expect(opciones.color).toBe('warning');
      expect(opciones.message).toContain('1.1');
      expect(toast.present).toHaveBeenCalled();
    });

    it('debería mostrar el aviso con pago vigente una sola vez por versión en la sesión', async () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-01-01T12:00:00Z'));
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      authService.verificarYActualizarSuscripcion.and.resolveTo(SUB_ACTIVA);

      await service.verificarAlNavegar('/tabs/home');
      jasmine.clock().tick(61000); // vence la caché de verificación
      await service.verificarAlNavegar('/tabs/eventos');

      expect(authService.getCurrentUserData).toHaveBeenCalledTimes(2);
      expect(toastCtrl.create).toHaveBeenCalledTimes(1);

      // Tras cerrar sesión se vuelve a avisar
      service.reiniciarSesion();
      await service.verificarAlNavegar('/tabs/home');
      expect(toastCtrl.create).toHaveBeenCalledTimes(2);
    });

    it('debería no pedir nada al administrador', async () => {
      authService.getCurrentUserData.and.resolveTo(ADMIN);
      await service.verificarAlNavegar('/dashboard');

      expect(modalCtrl.create).not.toHaveBeenCalled();
      expect(toastCtrl.create).not.toHaveBeenCalled();
    });

    it('debería no volver a consultar Firestore antes de 60 segundos', async () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-01-01T12:00:00Z'));
      authService.getCurrentUserData.and.resolveTo(USUARIO_AL_DIA);

      await service.verificarAlNavegar('/tabs/home');
      jasmine.clock().tick(59999);
      await service.verificarAlNavegar('/tabs/eventos');
      expect(authService.getCurrentUserData).toHaveBeenCalledTimes(1);

      jasmine.clock().tick(1);
      await service.verificarAlNavegar('/tabs/eventos');
      expect(authService.getCurrentUserData).toHaveBeenCalledTimes(2);
    });

    it('debería no abrir el modal si la sesión cambió durante la verificación', async () => {
      authService.getCurrentUserData.and.callFake(async () => {
        auth.currentUser = { uid: 'otro' };
        return USUARIO_DESACTUALIZADO;
      });

      await service.verificarAlNavegar('/tabs/home');
      expect(modalCtrl.create).not.toHaveBeenCalled();
    });

    it('debería no propagar errores de lectura (sin conexión)', async () => {
      spyOn(console, 'warn');
      authService.getCurrentUserData.and.rejectWith(new Error('unavailable'));

      await expectAsync(service.verificarAlNavegar('/tabs/home')).toBeResolved();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // =========================
  // 💳 ANTES DE PAGAR
  // =========================
  describe('asegurarAceptacionParaPagar', () => {
    it('debería permitir pagar sin abrir el modal si ya aceptó la versión vigente', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_AL_DIA);
      expect(await service.asegurarAceptacionParaPagar()).toBeTrue();
      expect(modalCtrl.create).not.toHaveBeenCalled();
    });

    it('debería exigir aceptar la versión vigente antes de pagar', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      cerrarModalCon('aceptado', { aceptado: true });

      expect(await service.asegurarAceptacionParaPagar()).toBeTrue();
      const opciones = modalCtrl.create.calls.mostRecent().args[0] as any;
      expect(opciones.componentProps.modo).toBe('consulta');
      expect(opciones.componentProps.motivo).toContain('(1.1)');
    });

    it('debería impedir pagar si cierra los términos sin aceptarlos', async () => {
      authService.getCurrentUserData.and.resolveTo(USUARIO_DESACTUALIZADO);
      cerrarModalCon('cancel', undefined);

      expect(await service.asegurarAceptacionParaPagar()).toBeFalse();
    });

    it('debería impedir pagar si no hay datos del usuario', async () => {
      authService.getCurrentUserData.and.resolveTo(null);
      expect(await service.asegurarAceptacionParaPagar()).toBeFalse();
    });
  });

  describe('abrirConsulta', () => {
    it('debería no abrir un segundo modal si ya hay uno abierto', async () => {
      let cerrar!: (v: any) => void;
      modal.onDidDismiss.and.returnValue(new Promise(r => cerrar = r));

      const primera = service.abrirConsulta();
      for (let i = 0; i < 10; i++) await Promise.resolve(); // deja que el modal se presente

      expect(await service.abrirConsulta()).toBeFalse();
      expect(modalCtrl.create).toHaveBeenCalledTimes(1);

      cerrar({ role: 'cancel' });
      expect(await primera).toBeFalse();
    });
  });
});
