import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';

import { CrearEventoPage } from './crear-evento.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';

/** Validaciones de la página antes de crear y límite persistente (SecurityService real, localStorage simulado). */
describe('CrearEventoPage: validaciones y límite de 5 eventos por hora', () => {
  let component: CrearEventoPage;
  let evento: jasmine.SpyObj<EventoService>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let router: jasmine.SpyObj<Router>;
  let auth: { currentUser: { uid: string } | null };
  let almacen: Record<string, string>;

  const DIA_MS = 24 * 60 * 60 * 1000;
  const LUGARES: any[] = [{ id: 'l1', nombre: 'Cerro', informacion: 'Info', altitud: '1000 m', dificultad: 'Media', distanciaKm: 5, tiempoEstimadoHoras: '3 h', equipamiento: [], DireccionPuntoInicio: 'Calle', requiereRegistroAcceso: false, requiereGuiaMontana: false, requierePagoEntrada: false, requiereMasInformacion: false, requiereHorarioVisita: false, requierePermiso: false }];

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;

  const llenarFormulario = (extra: any = {}) => component.eventoForm.patchValue({
    nombre: 'Salida al cerro',
    descripcion: 'Una salida de un día completo',
    fecha: new Date(Date.now() + DIA_MS).toISOString(),
    hora: '08:00',
    lugarId: 'l1',
    ...extra
  });

  const crear = () => {
    component.onCrearEvento(LUGARES);
    flush();
  };

  beforeEach(async () => {
    almacen = {};
    spyOn(localStorage, 'getItem').and.callFake((k: string) => almacen[k] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((k: string, v: string) => { almacen[k] = v; });

    auth = { currentUser: { uid: 'u1' } };
    evento = jasmine.createSpyObj<EventoService>('EventoService', ['crearEvento', 'getLugares']);
    evento.getLugares.and.returnValue(of([]));
    evento.crearEvento.and.callFake(async () => 'id-evento');

    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUserData']);
    authService.getCurrentUserData.and.callFake(async () => ({ uid: 'u1', nombre: 'Ana' } as any));

    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      declarations: [CrearEventoPage],
      imports: [ReactiveFormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: evento },
        { provide: AuthService, useValue: authService },
        { provide: Auth, useValue: auth },
        { provide: Router, useValue: router },
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl }
      ]
    }).overrideTemplate(CrearEventoPage, '').compileComponents();

    component = TestBed.createComponent(CrearEventoPage).componentInstance;
  });

  describe('límite persistente', () => {
    it('debería permitir 5 eventos y bloquear el sexto indicando los minutos de espera', fakeAsync(() => {
      llenarFormulario();

      for (let i = 0; i < 5; i++) crear();
      expect(evento.crearEvento).toHaveBeenCalledTimes(5);
      expect(alertCtrl.create).not.toHaveBeenCalled();

      crear();

      expect(evento.crearEvento).toHaveBeenCalledTimes(5);
      const alerta = alertCtrl.create.calls.mostRecent().args[0] as any;
      expect(alerta.header).toBe('⏳ Límite alcanzado');
      expect(alerta.message).toContain('5 eventos por hora');
      expect(alerta.message).toContain('60 minuto(s)');
    }));

    it('debería volver a permitir crear una vez pasada la hora', fakeAsync(() => {
      llenarFormulario();
      for (let i = 0; i < 6; i++) crear();
      expect(evento.crearEvento).toHaveBeenCalledTimes(5);

      tick(3600001);
      llenarFormulario();
      crear();

      expect(evento.crearEvento).toHaveBeenCalledTimes(6);
    }));

    it('debería no contar los intentos fallidos contra el límite', fakeAsync(() => {
      evento.crearEvento.and.callFake(async () => { throw new Error('unavailable'); });
      llenarFormulario();

      for (let i = 0; i < 6; i++) crear();

      expect(evento.crearEvento).toHaveBeenCalledTimes(6);
      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(ultimoToast().message).toBe('Error al crear el evento');
    }));

    it('debería contar los eventos de cada usuario por separado', fakeAsync(() => {
      llenarFormulario();
      for (let i = 0; i < 6; i++) crear();
      expect(evento.crearEvento).toHaveBeenCalledTimes(5);

      auth.currentUser = { uid: 'u2' };
      crear();

      expect(evento.crearEvento).toHaveBeenCalledTimes(6);
    }));
  });

  describe('validaciones antes de crear', () => {
    it('debería crear el evento privado, con el nombre sanitizado, y volver a la lista', fakeAsync(() => {
      llenarFormulario({ nombre: '  Salida & cerro ' });
      crear();

      const datos = evento.crearEvento.calls.mostRecent().args[0];
      expect(datos.nombre).toBe('Salida &amp; cerro');
      expect(datos.privado).toBeTrue();
      expect(datos.creadoPor).toEqual({ uid: 'u1', nombre: 'Ana' });
      expect(datos.lugar.nombre).toBe('Cerro');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/eventos', { replaceUrl: true });
    }));

    it('debería no crear con el formulario incompleto y marcar los campos', fakeAsync(() => {
      crear();

      expect(evento.crearEvento).not.toHaveBeenCalled();
      expect(component.eventoForm.get('nombre')?.touched).toBeTrue();
    }));

    it('debería exigir nombre de 3 a 100 caracteres y descripción de 10 a 500', () => {
      llenarFormulario();
      const nombre = component.eventoForm.get('nombre')!;
      const descripcion = component.eventoForm.get('descripcion')!;

      nombre.setValue('ab');
      expect(nombre.valid).toBeFalse();
      nombre.setValue('a'.repeat(101));
      expect(nombre.valid).toBeFalse();
      nombre.setValue('abc');
      expect(nombre.valid).toBeTrue();

      descripcion.setValue('corta');
      expect(descripcion.valid).toBeFalse();
      descripcion.setValue('a'.repeat(501));
      expect(descripcion.valid).toBeFalse();
    });

    it('debería rechazar contenido peligroso en nombre y descripción', fakeAsync(() => {
      llenarFormulario({ nombre: '<script>alert(1)</script>' });
      crear();
      expect(ultimoToast().message).toBe('El nombre contiene caracteres no permitidos');

      llenarFormulario({ descripcion: 'Texto con javascript:alert(1)' });
      crear();
      expect(ultimoToast().message).toBe('La descripción contiene caracteres no permitidos');

      expect(evento.crearEvento).not.toHaveBeenCalled();
    }));

    it('debería rechazar una fecha pasada', fakeAsync(() => {
      llenarFormulario({ fecha: new Date(Date.now() - 2 * DIA_MS).toISOString() });
      crear();

      expect(ultimoToast().message).toBe('La fecha no puede ser en el pasado');
      expect(evento.crearEvento).not.toHaveBeenCalled();
    }));

    it('debería rechazar un lugar que no está en el catálogo', fakeAsync(() => {
      llenarFormulario({ lugarId: 'inexistente' });
      crear();

      expect(ultimoToast().message).toBe('Selecciona un lugar válido');
      expect(evento.crearEvento).not.toHaveBeenCalled();
    }));

    it('debería redirigir a /login si la sesión expiró', fakeAsync(() => {
      auth.currentUser = null;
      llenarFormulario();
      crear();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
      expect(evento.crearEvento).not.toHaveBeenCalled();
    }));

    it('debería limpiar la fecha si se elige un día pasado', fakeAsync(() => {
      component.onFechaChange({ detail: { value: new Date(Date.now() - 2 * DIA_MS).toISOString() } });
      flush();

      expect(component.eventoForm.get('fecha')?.value).toBe('');
      expect(ultimoToast().message).toBe('La fecha no puede ser en el pasado');
    }));

    it('debería seleccionar un lugar del catálogo y rechazar uno desconocido', fakeAsync(() => {
      component.onLugarChange({ detail: { value: 'l1' } }, LUGARES);
      expect(component.lugarSeleccionado).toBe(LUGARES[0]);

      component.onLugarChange({ detail: { value: 'otro' } }, LUGARES);
      flush();

      expect(component.lugarSeleccionado).toBeNull();
      expect(component.eventoForm.get('lugarId')?.value).toBe('');
      expect(ultimoToast().message).toBe('Lugar no válido');
    }));
  });
});
