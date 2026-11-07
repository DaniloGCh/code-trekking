import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';

import { EventosPage } from './eventos.page';
import { AuthService } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';

describe('EventosPage: unirse con código y eliminar', () => {
  let component: EventosPage;
  let evento: jasmine.SpyObj<EventoService>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let auth: { currentUser: { uid: string } | null };

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;
  const opcionesAlerta = () => alertCtrl.create.calls.mostRecent().args[0] as any;
  const botonDeAlerta = (texto: string) => opcionesAlerta().buttons.find((b: any) => b.text === texto);

  /** Abre el diálogo y escribe el código; devuelve lo que retorna el botón "Unirse". */
  const unirseCon = (codigo: string | undefined) => {
    component.onUnirseConCodigo();
    flush();
    let retorno: any;
    botonDeAlerta('Unirse').handler({ codigo }).then((r: any) => retorno = r);
    flush();
    return retorno;
  };

  beforeEach(async () => {
    auth = { currentUser: { uid: 'u1' } };
    evento = jasmine.createSpyObj<EventoService>('EventoService', ['getMisEventos', 'unirseConCodigo', 'eliminarEvento']);
    evento.getMisEventos.and.returnValue(of([]));
    evento.unirseConCodigo.and.callFake(async () => ({ nombre: 'Cerro' } as any));
    evento.eliminarEvento.and.callFake(async () => undefined);

    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    const loadingCtrl = jasmine.createSpyObj<LoadingController>('LoadingController', ['create']);
    loadingCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve(), dismiss: () => Promise.resolve(true) })) as any);

    await TestBed.configureTestingModule({
      declarations: [EventosPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: evento },
        { provide: AuthService, useValue: {} },
        { provide: Auth, useValue: auth },
        { provide: Firestore, useValue: {} },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        { provide: LoadingController, useValue: loadingCtrl }
      ]
    }).overrideTemplate(EventosPage, '').compileComponents();

    component = TestBed.createComponent(EventosPage).componentInstance;
  });

  describe('unirse con código', () => {
    it('debería unirse con un código válido, normalizándolo y confirmando con el nombre', fakeAsync(() => {
      const retorno = unirseCon('  trk-abc123 ');

      expect(evento.unirseConCodigo).toHaveBeenCalledWith('TRK-ABC123');
      expect(ultimoToast().message).toBe('¡Te uniste a Cerro!');
      expect(ultimoToast().color).toBe('success');
      expect(retorno).toBeTrue();
    }));

    it('debería mantener el diálogo abierto si no se escribe un código', fakeAsync(() => {
      expect(unirseCon('   ')).toBeFalse();
      expect(ultimoToast().message).toBe('Ingresa un código válido');
      expect(evento.unirseConCodigo).not.toHaveBeenCalled();
    }));

    ['TRK-ABC12', 'TRK-ABC1234', 'ABC-123456', 'TRK-AB 123', 'TRK-ÑBC123'].forEach(codigo => {
      it(`debería rechazar el formato inválido "${codigo}" sin consultar`, fakeAsync(() => {
        expect(unirseCon(codigo)).toBeFalse();
        expect(ultimoToast().message).toContain('Formato de código inválido');
        expect(evento.unirseConCodigo).not.toHaveBeenCalled();
      }));
    });

    const errores: [string, string][] = [
      ['codigo-invalido', 'El código no existe o es incorrecto.'],
      ['ya-participante', 'Ya eres participante de este evento.'],
      ['evento-finalizado', 'No puedes unirte, el evento ya finalizó.'],
      ['otro-error', 'Error al unirse al evento']
    ];

    errores.forEach(([error, mensaje]) => {
      it(`debería mostrar "${mensaje}" ante el error ${error}`, fakeAsync(() => {
        evento.unirseConCodigo.and.callFake(async () => { throw new Error(error); });

        unirseCon('TRK-ABC123');

        expect(ultimoToast().message).toBe(mensaje);
        expect(ultimoToast().color).toBe('danger');
      }));
    });

    it('debería exigir sesión antes de abrir el diálogo', fakeAsync(() => {
      auth.currentUser = null;

      component.onUnirseConCodigo();
      flush();

      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(ultimoToast().message).toContain('Debes iniciar sesión');
    }));

    it('debería permitir 5 intentos por minuto, bloquear el siguiente y liberar pasado el minuto', fakeAsync(() => {
      for (let i = 0; i < 5; i++) {
        component.onUnirseConCodigo();
        flush();
      }
      expect(alertCtrl.create).toHaveBeenCalledTimes(5);

      component.onUnirseConCodigo();
      flush();
      expect(alertCtrl.create).toHaveBeenCalledTimes(5);
      expect(ultimoToast().message).toBe('Demasiados intentos. Espera un momento.');

      tick(60001);
      component.onUnirseConCodigo();
      flush();
      expect(alertCtrl.create).toHaveBeenCalledTimes(6);
    }));

    it('debería reiniciar los intentos tras unirse con éxito', fakeAsync(() => {
      for (let i = 0; i < 5; i++) unirseCon('TRK-ABC123');

      component.onUnirseConCodigo();
      flush();

      expect(alertCtrl.create).toHaveBeenCalledTimes(6);
    }));
  });

  describe('eliminar desde la lista', () => {
    const EVENTO: any = { id: 'e1', nombre: 'Cerro', creadoPor: { uid: 'org1', nombre: 'Org' } };

    it('debería impedirlo a quien no organizó el evento', fakeAsync(() => {
      component.currentUid = 'u1';

      component.onEliminarEvento(EVENTO);
      flush();

      expect(ultimoToast().message).toBe('No tienes permisos para eliminar este evento');
      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(evento.eliminarEvento).not.toHaveBeenCalled();
    }));

    it('debería eliminar tras confirmar si es el organizador', fakeAsync(() => {
      component.currentUid = 'org1';

      component.onEliminarEvento(EVENTO);
      flush();
      expect(evento.eliminarEvento).withContext('antes de confirmar').not.toHaveBeenCalled();

      botonDeAlerta('Eliminar').handler();
      flush();

      expect(evento.eliminarEvento).toHaveBeenCalledWith('e1');
      expect(ultimoToast().message).toBe('Evento eliminado');
    }));
  });
});
