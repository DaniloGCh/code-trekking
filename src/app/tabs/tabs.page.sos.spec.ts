import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';

import { TabsPage } from './tabs.page';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { SosService } from 'src/app/core/services/sos.service';

/** Botón SOS de la barra inferior: GPS y SMS simulados (no se toca el hardware). */
describe('TabsPage: botón SOS', () => {
  let component: TabsPage;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let sos: jasmine.SpyObj<SosService>;
  let router: jasmine.SpyObj<Router>;
  let authService: jasmine.SpyObj<AuthService>;

  const UBICACION = { latitud: -33.45, longitud: -70.66, precision: 5, timestamp: new Date(0) };
  const CONTACTOS = [{ nombre: 'Mamá', telefono: '+56911111111' }, { nombre: 'Papá', telefono: '+56922222222' }];
  const USUARIO = { uid: 'u1', email: 'a@b.cl', nombre: 'Ana', rol: 'user', contactosEmergencia: CONTACTOS } as UserData;

  const ultimoAlert = () => alertCtrl.create.calls.mostRecent().args[0] as any;
  const presionar = (opciones: any, texto: string) => opciones.buttons.find((b: any) => b.text === texto).handler();
  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;

  beforeEach(async () => {
    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), onDidDismiss: () => Promise.resolve({}) })) as any);

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);

    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);

    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUserData']);
    authService.getCurrentUserData.and.callFake(async () => USUARIO);
    sos = jasmine.createSpyObj<SosService>('SosService', ['obtenerUbicacion', 'construirMensajeSOS', 'enviarSosPorSMS', 'enviarSosPorWhatsApp']);
    sos.obtenerUbicacion.and.callFake(async () => UBICACION);
    sos.construirMensajeSOS.and.returnValue('MENSAJE-SOS');

    await TestBed.configureTestingModule({
      declarations: [TabsPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: Router, useValue: router },
        { provide: SosService, useValue: sos },
        { provide: AuthService, useValue: authService },
        { provide: Auth, useValue: { currentUser: null } },
        { provide: EventoService, useValue: { getMisEventos: () => of([]) } }
      ]
    }).overrideTemplate(TabsPage, '').compileComponents();

    component = TestBed.createComponent(TabsPage).componentInstance;
  });

  describe('advertencia sin contactos de emergencia', () => {
    const sinContactos: [string, UserData | null][] = [
      ['la lista de contactos está vacía', { ...USUARIO, contactosEmergencia: [] }],
      ['el perfil no tiene contactos', { ...USUARIO, contactosEmergencia: undefined }],
      ['no hay datos del usuario', null]
    ];

    sinContactos.forEach(([caso, datos]) => {
      it(`debería advertir y no pedir el GPS si ${caso}`, fakeAsync(() => {
        authService.getCurrentUserData.and.callFake(async () => datos);

        component.onSOS();
        flush();

        expect(ultimoAlert().header).toBe('⚠️ Sin contactos');
        expect(ultimoAlert().message).toContain('Configuración');
        expect(alertCtrl.create).toHaveBeenCalledTimes(1);
        expect(sos.obtenerUbicacion).not.toHaveBeenCalled();
      }));
    });

    it('debería llevar a Configuración desde la advertencia', fakeAsync(() => {
      authService.getCurrentUserData.and.callFake(async () => ({ ...USUARIO, contactosEmergencia: [] }));
      component.onSOS();
      flush();

      presionar(ultimoAlert(), 'Ir a configuración');

      expect(router.navigateByUrl).toHaveBeenCalledWith('/settings');
    }));
  });

  describe('con contactos de emergencia', () => {
    const confirmarEnvio = () => {
      component.onSOS();
      flush();
      presionar(ultimoAlert(), '🆘 ENVIAR AHORA');
      flush();
    };

    it('debería pedir confirmación indicando la cantidad de contactos, sin usar aún el GPS', fakeAsync(() => {
      component.onSOS();
      flush();

      expect(ultimoAlert().message).toContain('2 contacto(s)');
      expect(sos.obtenerUbicacion).not.toHaveBeenCalled();
    }));

    it('debería armar el mensaje con la ubicación y el evento activo', fakeAsync(() => {
      component.misEventos = [{ nombre: 'Cerro La Campana' } as any];
      confirmarEnvio();

      expect(sos.construirMensajeSOS).toHaveBeenCalledWith(USUARIO, UBICACION, 'Cerro La Campana');
    }));

    it('debería armar el mensaje sin evento si el usuario no tiene eventos', fakeAsync(() => {
      confirmarEnvio();
      expect(sos.construirMensajeSOS).toHaveBeenCalledWith(USUARIO, UBICACION, undefined);
    }));

    it('debería avisar de activar el GPS si el permiso fue denegado, sin armar el mensaje', fakeAsync(() => {
      sos.obtenerUbicacion.and.callFake(async () => { throw new Error('permiso-denegado'); });
      confirmarEnvio();

      expect(ultimoToast().message).toBe('Necesitas activar el GPS para enviar tu ubicación');
      expect(sos.construirMensajeSOS).not.toHaveBeenCalled();
      expect(component.sosActivo).toBeFalse();
    }));

    it('debería enviar un solo SMS con todos los teléfonos', fakeAsync(() => {
      confirmarEnvio();

      presionar(ultimoAlert(), '💬 SMS (recomendado)');
      flush();

      expect(sos.enviarSosPorSMS).toHaveBeenCalledOnceWith('+56911111111,+56922222222', 'MENSAJE-SOS');
      expect(ultimoToast().message).toBe('✅ Alerta enviada a 2 contacto(s)');
      expect(component.sosActivo).toBeFalse();
    }));

    it('debería liberar el SOS al cancelar la elección del medio', fakeAsync(() => {
      confirmarEnvio();
      expect(component.sosActivo).toBeTrue();

      presionar(ultimoAlert(), 'Cancelar');

      expect(component.sosActivo).toBeFalse();
    }));
  });
});
