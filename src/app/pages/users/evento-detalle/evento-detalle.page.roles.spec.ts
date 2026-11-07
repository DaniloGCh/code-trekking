import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

import { EventoDetallePage } from './evento-detalle.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';

describe('EventoDetallePage: reglas de organizador y participante', () => {
  let component: EventoDetallePage;
  let evento: jasmine.SpyObj<EventoService>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let router: jasmine.SpyObj<Router>;
  let idRuta: string | null;

  const EVENTO: any = {
    id: 'e1',
    nombre: 'Cerro',
    codigoInvitacion: 'TRK-ABC123',
    creadoPor: { uid: 'org1', nombre: 'Organizador' },
    participantes: ['org1', 'u1'],
    participantesInfo: []
  };

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;
  const presionar = (texto: string) =>
    (alertCtrl.create.calls.mostRecent().args[0] as any).buttons.find((b: any) => b.text === texto).handler();

  /** Carga la página como el usuario indicado. */
  const abrirComo = (uid: string) => {
    component.currentUid = uid;
    component.ngOnInit();
    flush();
  };

  beforeEach(async () => {
    idRuta = 'e1';
    evento = jasmine.createSpyObj<EventoService>('EventoService', ['getEventoById', 'contarMensajesNuevos', 'salirEvento', 'eliminarEvento']);
    evento.getEventoById.and.callFake(async () => EVENTO);
    evento.contarMensajesNuevos.and.callFake(async () => 0);
    evento.salirEvento.and.callFake(async () => undefined);
    evento.eliminarEvento.and.callFake(async () => undefined);

    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      declarations: [EventoDetallePage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: evento },
        { provide: AuthService, useValue: {} },
        { provide: Auth, useValue: { currentUser: { uid: 'u1' } } },
        { provide: Router, useValue: router },
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl },
        { provide: ActivatedRoute, useValue: { snapshot: { get paramMap() { return convertToParamMap(idRuta ? { id: idRuta } : {}); } } } }
      ]
    }).overrideTemplate(EventoDetallePage, '').compileComponents();

    component = TestBed.createComponent(EventoDetallePage).componentInstance;
  });

  it('debería reconocer al organizador y al participante', fakeAsync(() => {
    abrirComo('org1');
    expect(component.esCreadoPor).toBeTrue();

    abrirComo('u1');
    expect(component.esCreadoPor).toBeFalse();
  }));

  it('debería volver a eventos si la ruta no trae id o el id es peligroso', fakeAsync(() => {
    idRuta = null;
    TestBed.createComponent(EventoDetallePage).componentInstance.ngOnInit();
    flush();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/eventos', { replaceUrl: true });
    expect(evento.getEventoById).not.toHaveBeenCalled();

    idRuta = '<script>';
    TestBed.createComponent(EventoDetallePage).componentInstance.ngOnInit();
    flush();
    expect(ultimoToast().message).toBe('ID de evento inválido');
    expect(evento.getEventoById).not.toHaveBeenCalled();
  }));

  describe('salir del evento', () => {
    it('debería impedir que el organizador abandone su evento', fakeAsync(() => {
      abrirComo('org1');

      component.onSalirEvento();
      flush();

      expect(ultimoToast().message).toBe('El organizador no puede salir del evento');
      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(evento.salirEvento).not.toHaveBeenCalled();
    }));

    it('debería pedir confirmación y permitir salir al participante', fakeAsync(() => {
      abrirComo('u1');

      component.onSalirEvento();
      flush();
      expect(evento.salirEvento).withContext('antes de confirmar').not.toHaveBeenCalled();

      presionar('Salir');
      flush();

      expect(evento.salirEvento).toHaveBeenCalledWith('e1', 'u1');
      expect(ultimoToast().message).toBe('Saliste del evento');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/eventos', { replaceUrl: true });
    }));

    it('debería quedarse en la página si falla la salida', fakeAsync(() => {
      evento.salirEvento.and.callFake(async () => { throw new Error('unavailable'); });
      abrirComo('u1');
      component.onSalirEvento();
      flush();

      presionar('Salir');
      flush();

      expect(ultimoToast().message).toBe('Error al salir del evento');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    }));
  });

  describe('eliminar el evento', () => {
    it('debería impedir que un participante elimine el evento', fakeAsync(() => {
      abrirComo('u1');

      component.onEliminarEvento();
      flush();

      expect(ultimoToast().message).toBe('No tienes permisos para eliminar este evento');
      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(evento.eliminarEvento).not.toHaveBeenCalled();
    }));

    it('debería pedir confirmación y permitir eliminar al organizador', fakeAsync(() => {
      abrirComo('org1');

      component.onEliminarEvento();
      flush();
      expect(evento.eliminarEvento).withContext('antes de confirmar').not.toHaveBeenCalled();

      presionar('Eliminar');
      flush();

      expect(evento.eliminarEvento).toHaveBeenCalledWith('e1');
      expect(ultimoToast().message).toBe('Evento eliminado');
    }));

    it('debería escapar el nombre del evento en la confirmación', fakeAsync(() => {
      evento.getEventoById.and.callFake(async () => ({ ...EVENTO, nombre: '<b>Cerro</b>' }));
      abrirComo('org1');

      component.onEliminarEvento();
      flush();

      expect((alertCtrl.create.calls.mostRecent().args[0] as any).message).not.toContain('<b>');
    }));
  });

  describe('código de invitación', () => {
    it('debería mostrarlo oculto hasta que se pida verlo', fakeAsync(() => {
      abrirComo('u1');
      expect(component.codigoMostrado).toBe('••••••••••');

      component.toggleCodigoVisible();
      expect(component.codigoMostrado).toBe('TRK-ABC123');

      component.toggleCodigoVisible();
      expect(component.codigoMostrado).toBe('••••••••••');
    }));
  });
});
