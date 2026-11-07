import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush, flushMicrotasks } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';

import { HomePage } from './home.page';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { ConsejoService } from 'src/app/core/services/consejo.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { KitPrimerosAuxiliosService } from 'src/app/core/services/kit-primeros-auxilios.service';
import { KitSupervivenciaService } from 'src/app/core/services/kit-supervivencia.service';
import { SosService } from 'src/app/core/services/sos.service';
import { TimeService } from 'src/app/core/services/time.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { WeatherService } from 'src/app/core/services/weather.service';

/** Flujo SOS de la página: GPS, SMS y WhatsApp simulados (no se toca el hardware). */
describe('HomePage: flujo SOS', () => {
  let component: HomePage;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let sos: jasmine.SpyObj<SosService>;
  let router: jasmine.SpyObj<Router>;
  /** Botón que "presiona" el usuario en los diálogos de WhatsApp. */
  let botonWhatsapp: string;

  const UBICACION = { latitud: -33.45, longitud: -70.66, precision: 5, timestamp: new Date(0) };
  const CONTACTOS = [{ nombre: 'Mamá', telefono: '+56911111111' }, { nombre: 'Papá', telefono: '+56922222222' }];
  const usuario = (extra: Partial<UserData> = {}) =>
    ({ uid: 'u1', email: 'a@b.cl', nombre: 'Ana', rol: 'user', contactosEmergencia: CONTACTOS, ...extra } as UserData);

  const ultimoAlert = () => alertCtrl.create.calls.mostRecent().args[0] as any;
  const presionar = (opciones: any, texto: string) => opciones.buttons.find((b: any) => b.text === texto).handler();
  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;

  beforeEach(async () => {
    botonWhatsapp = 'Enviar';
    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async (opciones: any) => ({
      present: () => Promise.resolve(),
      onDidDismiss: async () => {
        // Diálogos por contacto: simula la decisión del usuario
        if (opciones.header === '📱 WhatsApp') {
          opciones.buttons.find((b: any) => b.text === botonWhatsapp).handler?.();
        }
        return {};
      }
    })) as any);

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);

    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);

    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    sos = jasmine.createSpyObj<SosService>('SosService', ['obtenerUbicacion', 'construirMensajeSOS', 'enviarSosPorSMS', 'enviarSosPorWhatsApp']);
    sos.obtenerUbicacion.and.callFake(async () => UBICACION);
    sos.construirMensajeSOS.and.returnValue('MENSAJE-SOS');

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: ModalController, useValue: {} },
        { provide: Router, useValue: router },
        { provide: SosService, useValue: sos },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: AuthService, useValue: {} },
        { provide: EventoService, useValue: {} },
        { provide: ConsejoService, useValue: {} },
        { provide: HttpClient, useValue: {} },
        { provide: WeatherService, useValue: {} },
        { provide: TimeService, useValue: {} },
        { provide: KitPrimerosAuxiliosService, useValue: { getKits: () => of([]) } },
        { provide: KitSupervivenciaService, useValue: { getKits: () => of([]) } },
        { provide: WeatherGlobalService, useValue: { temperature: of(null), description: of(''), locationName: of(''), icon: of(''), humidity: of(null), windSpeed: of(null), stopLocationTracking: () => Promise.resolve() } }
      ]
    }).overrideTemplate(HomePage, '').compileComponents();

    component = TestBed.createComponent(HomePage).componentInstance;
  });

  describe('advertencia sin contactos de emergencia', () => {
    const sinContactos: [string, UserData | null][] = [
      ['la lista de contactos está vacía', usuario({ contactosEmergencia: [] })],
      ['el perfil no tiene contactos', usuario({ contactosEmergencia: undefined })],
      ['no se cargaron los datos del usuario', null]
    ];

    sinContactos.forEach(([caso, datos]) => {
      it(`debería advertir y no pedir el GPS si ${caso}`, fakeAsync(() => {
        component.userData = datos;

        component.onSOS();
        flush();

        expect(ultimoAlert().header).toBe('⚠️ Sin contactos');
        expect(ultimoAlert().message).toContain('Configuración');
        expect(alertCtrl.create).toHaveBeenCalledTimes(1);
        expect(sos.obtenerUbicacion).not.toHaveBeenCalled();
      }));
    });

    it('debería llevar a Configuración desde la advertencia', fakeAsync(() => {
      component.userData = usuario({ contactosEmergencia: [] });
      component.onSOS();
      flush();

      presionar(ultimoAlert(), 'Ir a configuración');

      expect(router.navigateByUrl).toHaveBeenCalledWith('/settings');
    }));
  });

  describe('con contactos de emergencia', () => {
    beforeEach(() => component.userData = usuario());

    const confirmarEnvio = () => {
      component.onSOS();
      flush();
      presionar(ultimoAlert(), '🆘 ENVIAR AHORA');
      flush();
    };

    it('debería pedir confirmación indicando la cantidad de contactos, sin usar aún el GPS', fakeAsync(() => {
      component.onSOS();
      flush();

      expect(ultimoAlert().header).toBe('🆘 ENVIAR ALERTA SOS');
      expect(ultimoAlert().message).toContain('2 contacto(s)');
      expect(sos.obtenerUbicacion).not.toHaveBeenCalled();
    }));

    it('debería armar el mensaje con la ubicación y el evento activo', fakeAsync(() => {
      component.misEventos = [{ nombre: 'Cerro La Campana' } as any, { nombre: 'Otro' } as any];
      confirmarEnvio();

      expect(sos.construirMensajeSOS).toHaveBeenCalledWith(component.userData!, UBICACION, 'Cerro La Campana');
    }));

    it('debería armar el mensaje sin evento si el usuario no tiene eventos', fakeAsync(() => {
      component.misEventos = [];
      confirmarEnvio();

      expect(sos.construirMensajeSOS).toHaveBeenCalledWith(component.userData!, UBICACION, undefined);
    }));

    it('debería avisar de activar el GPS si el permiso fue denegado, sin armar el mensaje', fakeAsync(() => {
      sos.obtenerUbicacion.and.callFake(async () => { throw new Error('permiso-denegado'); });
      confirmarEnvio();

      expect(ultimoToast().message).toBe('Necesitas activar el GPS para enviar tu ubicación');
      expect(ultimoToast().color).toBe('danger');
      expect(sos.construirMensajeSOS).not.toHaveBeenCalled();
      expect(component.sosActivo).toBeFalse();
    }));

    it('debería avisar si no se pudo obtener la ubicación', fakeAsync(() => {
      sos.obtenerUbicacion.and.callFake(async () => { throw new Error('ubicacion-no-disponible'); });
      confirmarEnvio();

      expect(ultimoToast().message).toContain('No se pudo obtener tu ubicación');
      expect(sos.construirMensajeSOS).not.toHaveBeenCalled();
    }));

    it('debería mantener el SOS activo hasta elegir el medio y liberarlo al cancelar', fakeAsync(() => {
      confirmarEnvio();
      expect(component.sosActivo).toBeTrue();

      presionar(ultimoAlert(), 'Cancelar');

      expect(component.sosActivo).toBeFalse();
      expect(sos.enviarSosPorSMS).not.toHaveBeenCalled();
    }));

    it('debería enviar un solo SMS con todos los teléfonos', fakeAsync(() => {
      confirmarEnvio();

      presionar(ultimoAlert(), '💬 SMS (recomendado)');
      flush();

      expect(sos.enviarSosPorSMS).toHaveBeenCalledOnceWith('+56911111111,+56922222222', 'MENSAJE-SOS');
      expect(ultimoToast().message).toBe('✅ Alerta enviada a 2 contacto(s)');
      expect(component.sosActivo).toBeFalse();
    }));

    it('debería enviar por WhatsApp a cada contacto confirmado', fakeAsync(() => {
      confirmarEnvio();

      presionar(ultimoAlert(), '📱 WhatsApp');
      flush();

      expect(sos.enviarSosPorWhatsApp).toHaveBeenCalledTimes(2);
      expect(sos.enviarSosPorWhatsApp).toHaveBeenCalledWith('+56911111111', 'MENSAJE-SOS');
      expect(sos.enviarSosPorWhatsApp).toHaveBeenCalledWith('+56922222222', 'MENSAJE-SOS');
      expect(ultimoToast().message).toBe('✅ Alerta enviada a 2 contacto(s)');
    }));

    it('debería no contar como enviada una alerta si se saltan todos los contactos', fakeAsync(() => {
      botonWhatsapp = 'Saltar';
      confirmarEnvio();

      presionar(ultimoAlert(), '📱 WhatsApp');
      flush();
      flushMicrotasks();

      expect(sos.enviarSosPorWhatsApp).not.toHaveBeenCalled();
      expect(ultimoToast().message).toBe('No se envió ninguna alerta');
      expect(ultimoToast().color).toBe('warning');
    }));
  });
});
