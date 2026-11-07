import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { CameraSource } from '@capacitor/camera';
import { CameraWeb } from '@capacitor/camera/dist/esm/web';
import { of } from 'rxjs';

import { GaleriaPage } from './galeria.page';
import { AuthService, SuscripcionData } from 'src/app/core/services/auth.service';
import { FotoService } from 'src/app/core/services/foto.service';
import { GaleriaFotosService } from 'src/app/core/services/galeria-fotos.service';

/** La galería es la función de pago: el acceso depende de la vigencia de la suscripción. */
describe('GaleriaPage: acceso según la suscripción', () => {
  let component: GaleriaPage;
  let authService: jasmine.SpyObj<AuthService>;
  let galeria: jasmine.SpyObj<GaleriaFotosService>;
  let foto: jasmine.SpyObj<FotoService>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let router: jasmine.SpyObj<Router>;

  const USUARIO: any = { uid: 'u1', nombre: 'Ana' };
  const FOTOS: any[] = [{ id: 'f1', uid: 'u1', nombreUsuario: 'Ana', imageUrl: 'x', fechaSubida: '2026-01-01' }];

  const suscripcion = (extra: Partial<SuscripcionData> = {}): SuscripcionData => ({
    activa: true,
    plan: 'mensual',
    fechaInicio: '2026-01-01T00:00:00Z',
    fechaVencimiento: '2026-02-01T00:00:00Z',
    ...extra
  });

  const cargar = async (sub: SuscripcionData | null, diasGracia: number | null = null) => {
    authService.verificarYActualizarSuscripcion.and.resolveTo(sub);
    authService.diasRestantesDeGracia.and.returnValue(diasGracia);
    await (component as any).cargarTodoElEstado();
  };

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUserData', 'verificarYActualizarSuscripcion', 'diasRestantesDeGracia']);
    authService.getCurrentUserData.and.resolveTo(USUARIO);
    galeria = jasmine.createSpyObj<GaleriaFotosService>('GaleriaFotosService', ['obtenerFotosUsuario', 'subirFoto']);
    galeria.obtenerFotosUsuario.and.returnValue(of(FOTOS));
    galeria.subirFoto.and.resolveTo();
    foto = jasmine.createSpyObj<FotoService>('FotoService', ['validarFoto', 'comprimirFoto']);
    foto.validarFoto.and.returnValue({ valid: true, message: '' });
    foto.comprimirFoto.and.resolveTo('data:image/jpeg;base64,COMPRIMIDA');

    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);

    await TestBed.configureTestingModule({
      declarations: [GaleriaPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: GaleriaFotosService, useValue: galeria },
        { provide: FotoService, useValue: foto },
        { provide: Router, useValue: router },
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: ActionSheetController, useValue: {} }
      ]
    }).overrideTemplate(GaleriaPage, '').compileComponents();

    component = TestBed.createComponent(GaleriaPage).componentInstance;
  });

  describe('vigencia', () => {
    it('debería dar acceso y cargar las fotos con una suscripción activa', async () => {
      await cargar(suscripcion());

      expect(component.suscripcionActiva).toBeTrue();
      expect(component.mostrarGaleria).toBeTrue();
      expect(galeria.obtenerFotosUsuario).toHaveBeenCalledWith('u1');
      expect(component.fotos).toEqual(FOTOS);
    });

    const sinAcceso: [string, SuscripcionData | null][] = [
      ['nunca pagó', null],
      ['la suscripción venció', suscripcion({ activa: false })]
    ];

    sinAcceso.forEach(([caso, sub]) => {
      it(`debería mostrar los planes y no cargar fotos si ${caso}`, async () => {
        await cargar(sub);

        expect(component.suscripcionActiva).toBeFalse();
        expect(component.mostrarGaleria).toBeFalse();
        expect(galeria.obtenerFotosUsuario).not.toHaveBeenCalled();
        expect(component.planActivoNombre).toBe('');
        expect(component.fechaFinSuscripcion).toBeNull();
      });
    });

    it('debería no consultar la suscripción si no hay datos del usuario', async () => {
      authService.getCurrentUserData.and.resolveTo(null);
      await cargar(suscripcion());

      expect(authService.verificarYActualizarSuscripcion).not.toHaveBeenCalled();
      expect(component.mostrarGaleria).toBeFalse();
      expect(component.cargandoSuscripcion).toBeFalse();
    });

    it('debería mantener el acceso y avisar los días restantes durante la gracia', async () => {
      await cargar(suscripcion(), 3);

      expect(component.mostrarGaleria).toBeTrue();
      expect(component.diasGracia).toBe(3);
      const alerta = alertCtrl.create.calls.mostRecent().args[0] as any;
      expect(alerta.header).toBe('Tu suscripción venció');
      expect(alerta.message).toContain('3 día(s)');
    });

    it('debería no avisar nada si la suscripción está al día', async () => {
      await cargar(suscripcion());
      expect(alertCtrl.create).not.toHaveBeenCalled();
    });

    it('debería quitar la pantalla de carga aunque falle la verificación', async () => {
      authService.verificarYActualizarSuscripcion.and.rejectWith(new Error('unavailable'));

      await expectAsync((component as any).cargarTodoElEstado()).toBeRejected();

      expect(component.cargandoSuscripcion).toBeFalse();
      expect(component.mostrarGaleria).toBeFalse();
    });
  });

  describe('datos del plan', () => {
    it('debería mostrar la fecha de término, prefiriendo fechaFin', async () => {
      await cargar(suscripcion({ fechaFin: '2026-03-01T00:00:00Z' }));
      expect(component.fechaFinSuscripcion).toEqual(new Date('2026-03-01T00:00:00Z'));
    });

    it('debería usar fechaVencimiento si no hay fechaFin', async () => {
      await cargar(suscripcion());
      expect(component.fechaFinSuscripcion).toEqual(new Date('2026-02-01T00:00:00Z'));
    });

    it('debería aceptar la fecha como Timestamp de Firestore', async () => {
      const fecha = new Date('2026-04-01T00:00:00Z');
      await cargar(suscripcion({ fechaFin: { toDate: () => fecha } }));
      expect(component.fechaFinSuscripcion).toEqual(fecha);
    });

    it('debería armar el nombre del plan según los datos disponibles', async () => {
      await cargar(suscripcion({ nombrePlan: 'Plan Especial' }));
      expect(component.planActivoNombre).toBe('Plan Especial');

      await cargar(suscripcion({ plan: 'anual' }));
      expect(component.planActivoNombre).toBe('Plan Anual');

      await cargar(suscripcion({ plan: null }));
      expect(component.planActivoNombre).toBe('Plan Premium');
    });
  });

  describe('navegación entre galería y planes', () => {
    it('debería permitir ver los planes a quien ya tiene suscripción y volver', async () => {
      await cargar(suscripcion());

      component.toggleVistaPlanes();
      expect(component.mostrarGaleria).toBeFalse();

      component.toggleVistaPlanes();
      expect(component.mostrarGaleria).toBeTrue();
    });

    it('debería ir a pagos con el plan elegido', () => {
      component.seleccionarPlan('trimestral');
      expect(router.navigate).toHaveBeenCalledWith(['/pagos'], { queryParams: { plan: 'trimestral' } });
    });
  });

  describe('subir una foto', () => {
    const subir = async () => {
      await (component as any).capturarYSubir(CameraSource.Camera);
    };

    beforeEach(() => {
      component.userData = USUARIO;
      spyOn(CameraWeb.prototype, 'getPhoto').and.resolveTo({ base64String: 'ORIGINAL', format: 'jpeg', saved: false });
    });

    it('debería guardar la versión comprimida con los datos del usuario', async () => {
      await subir();

      const subida = galeria.subirFoto.calls.mostRecent().args[0];
      expect(subida.uid).toBe('u1');
      expect(subida.nombreUsuario).toBe('Ana');
      expect(subida.imageUrl).toBe('data:image/jpeg;base64,COMPRIMIDA');
      expect(new Date(subida.fechaSubida).toISOString()).toBe(subida.fechaSubida);
      expect(ultimoToast().message).toBe('Foto subida a tu galería');
    });

    it('debería avisar si falla la compresión, sin subir', async () => {
      foto.comprimirFoto.and.rejectWith(new Error('Error al cargar la imagen'));

      await subir();

      expect(galeria.subirFoto).not.toHaveBeenCalled();
      expect(ultimoToast().message).toBe('Error al subir la foto');
    });

    it('debería avisar si falla la subida', async () => {
      galeria.subirFoto.and.rejectWith(new Error('unavailable'));

      await subir();

      expect(ultimoToast().message).toBe('Error al subir la foto');
    });

    it('debería no hacer nada si no hay datos del usuario', async () => {
      component.userData = null;

      await subir();

      expect(CameraWeb.prototype.getPhoto).not.toHaveBeenCalled();
    });

    it('debería avisar si la cámara falla o se cancela', async () => {
      (CameraWeb.prototype.getPhoto as jasmine.Spy).and.rejectWith(new Error('User cancelled photos app'));

      await subir();

      expect(galeria.subirFoto).not.toHaveBeenCalled();
      expect(ultimoToast().message).toBe('No se pudo obtener la foto');
    });
  });
});
