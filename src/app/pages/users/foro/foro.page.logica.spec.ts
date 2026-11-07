import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController, ToastController } from '@ionic/angular';
import { of } from 'rxjs';

import { ForoPage } from './foro.page';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { EventoService } from 'src/app/core/services/evento.service';

/** La lógica del foro vive en la página: validar, sanitizar y limitar antes de llamar al servicio. */
describe('ForoPage: mensajes del foro por evento', () => {
  let component: ForoPage;
  let evento: jasmine.SpyObj<EventoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let router: jasmine.SpyObj<Router>;
  let auth: { currentUser: { uid: string } | null };
  let parametros: Record<string, string>;

  const USUARIO = { uid: 'u1', nombre: 'Ana' } as UserData;

  const ultimoToast = () => toastCtrl.create.calls.mostRecent().args[0] as any;
  const textoEnviado = () => (evento.enviarMensaje.calls.mostRecent().args[1] as any).texto;

  const crear = () => {
    component = TestBed.createComponent(ForoPage).componentInstance;
    return component;
  };

  /** Página lista para escribir: con sesión, datos del usuario y evento. */
  const listo = () => {
    crear();
    component.userData = USUARIO;
    component.eventoId = 'e1';
    component.organizadorUid = 'org1';
  };

  const enviar = (texto: string) => {
    component.nuevoMensaje = texto;
    component.onEnviarMensaje();
    flush();
  };

  beforeEach(async () => {
    auth = { currentUser: { uid: 'u1' } };
    parametros = { eventoId: 'e1', organizadorUid: 'org1' };

    evento = jasmine.createSpyObj<EventoService>('EventoService', ['enviarMensaje', 'eliminarMensaje', 'getMensajesForoRealtime', 'marcarForoVisto']);
    evento.enviarMensaje.and.callFake(async () => undefined);
    evento.eliminarMensaje.and.callFake(async () => undefined);
    evento.getMensajesForoRealtime.and.returnValue(of([]));

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUserData']);
    authService.getCurrentUserData.and.callFake(async () => USUARIO);

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertCtrl.create.and.callFake((async () => ({ present: () => Promise.resolve() })) as any);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      declarations: [ForoPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: EventoService, useValue: evento },
        { provide: AuthService, useValue: authService },
        { provide: ToastController, useValue: toastCtrl },
        { provide: AlertController, useValue: alertCtrl },
        { provide: Router, useValue: router },
        { provide: Auth, useValue: auth },
        { provide: ActivatedRoute, useFactory: () => ({ snapshot: { paramMap: convertToParamMap(parametros) } }) }
      ]
    }).overrideTemplate(ForoPage, '').compileComponents();
  });

  // =========================
  // 🚀 ENTRADA AL FORO
  // =========================
  describe('al abrir el foro', () => {
    it('debería escuchar los mensajes del evento y marcar el foro como visto', fakeAsync(() => {
      crear().ngOnInit();
      flush();

      expect(evento.getMensajesForoRealtime).toHaveBeenCalledWith('e1');
      expect(evento.marcarForoVisto).toHaveBeenCalledWith('e1', 'u1');
      expect(component.userData).toEqual(USUARIO);
    }));

    it('debería redirigir a /login sin sesión', fakeAsync(() => {
      auth.currentUser = null;
      crear().ngOnInit();
      flush();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
      expect(evento.getMensajesForoRealtime).not.toHaveBeenCalled();
    }));

    it('debería volver a eventos si faltan los parámetros de la ruta', fakeAsync(() => {
      parametros = { eventoId: 'e1' };
      crear().ngOnInit();
      flush();

      expect(ultimoToast().message).toBe('Foro no disponible');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/eventos', { replaceUrl: true });
      expect(evento.getMensajesForoRealtime).not.toHaveBeenCalled();
    }));

    it('debería rechazar parámetros de ruta con contenido peligroso', fakeAsync(() => {
      parametros = { eventoId: '<script>x', organizadorUid: 'org1' };
      crear().ngOnInit();
      flush();

      expect(ultimoToast().message).toBe('Parámetros inválidos');
      expect(evento.getMensajesForoRealtime).not.toHaveBeenCalled();
    }));
  });

  // =========================
  // ✍️ ENVÍO
  // =========================
  describe('al enviar un mensaje', () => {
    beforeEach(() => listo());

    it('debería enviar el texto con los datos del autor y limpiar la caja', fakeAsync(() => {
      enviar('  Nos vemos a las 8  ');

      expect(evento.enviarMensaje).toHaveBeenCalledTimes(1);
      const [eventoId, mensaje] = evento.enviarMensaje.calls.mostRecent().args;
      expect(eventoId).toBe('e1');
      expect(mensaje.texto).toBe('Nos vemos a las 8');
      expect(mensaje.autorUid).toBe('u1');
      expect(mensaje.autorNombre).toBe('Ana');
      expect(component.nuevoMensaje).toBe('');
    }));

    it('debería ignorar un mensaje vacío o solo con espacios', fakeAsync(() => {
      enviar('');
      enviar('    ');

      expect(evento.enviarMensaje).not.toHaveBeenCalled();
      expect(toastCtrl.create).not.toHaveBeenCalled();
    }));

    it('debería escapar los caracteres especiales antes de guardar', fakeAsync(() => {
      enviar('Tomás & Ana: 1 < 2');
      expect(textoEnviado()).toBe('Tomás &amp; Ana: 1 &lt; 2');
    }));

    const peligrosos = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<iframe src="https://x.cl">',
      'document.cookie'
    ];

    peligrosos.forEach(texto => {
      it(`debería bloquear y descartar el mensaje peligroso ${texto}`, fakeAsync(() => {
        enviar(texto);

        expect(evento.enviarMensaje).not.toHaveBeenCalled();
        expect(ultimoToast().message).toBe('El mensaje contiene contenido no permitido');
        expect(ultimoToast().color).toBe('danger');
        expect(component.nuevoMensaje).toBe('');
      }));
    });

    it('debería aceptar hasta 500 caracteres y rechazar 501', fakeAsync(() => {
      enviar('a'.repeat(500));
      expect(evento.enviarMensaje).toHaveBeenCalledTimes(1);

      enviar('a'.repeat(501));
      expect(evento.enviarMensaje).toHaveBeenCalledTimes(1);
      expect(ultimoToast().message).toBe('El mensaje contiene contenido no permitido');
    }));

    it('debería permitir 10 mensajes por minuto, bloquear el siguiente y liberar pasado el minuto', fakeAsync(() => {
      for (let i = 0; i < 10; i++) enviar(`mensaje ${i}`);
      expect(evento.enviarMensaje).toHaveBeenCalledTimes(10);

      enviar('uno de más');
      expect(evento.enviarMensaje).toHaveBeenCalledTimes(10);
      expect(ultimoToast().color).toBe('warning');
      expect(component.nuevoMensaje).withContext('conserva el texto para reintentar').toBe('uno de más');

      tick(60001);
      enviar('ya puedo');
      expect(evento.enviarMensaje).toHaveBeenCalledTimes(11);
    }));

    it('debería redirigir a /login si la sesión expiró, sin enviar', fakeAsync(() => {
      auth.currentUser = null;
      enviar('hola');

      expect(evento.enviarMensaje).not.toHaveBeenCalled();
      expect(ultimoToast().message).toContain('sesión ha expirado');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    }));

    it('debería tratar como sesión expirada que no estén cargados los datos del usuario', fakeAsync(() => {
      component.userData = null;
      enviar('hola');

      expect(evento.enviarMensaje).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    }));

    it('debería avisar si falla el envío', fakeAsync(() => {
      evento.enviarMensaje.and.callFake(async () => { throw new Error('unavailable'); });
      enviar('hola');

      expect(ultimoToast().message).toBe('Error al enviar el mensaje');
      expect(ultimoToast().color).toBe('danger');
    }));
  });

  // =========================
  // 😊 EMOJIS
  // =========================
  describe('agregarEmoji', () => {
    beforeEach(() => listo());

    it('debería agregar el emoji al mensaje', () => {
      component.nuevoMensaje = 'Vamos ';
      component.agregarEmoji('🥾');
      expect(component.nuevoMensaje).toBe('Vamos 🥾');
    });

    it('debería no pasarse de 500 caracteres', fakeAsync(() => {
      component.nuevoMensaje = 'a'.repeat(499);
      component.agregarEmoji('🥾'); // ocupa 2 unidades de texto
      flush();

      expect(component.nuevoMensaje.length).toBe(499);
      expect(ultimoToast().message).toBe('El mensaje no puede superar 500 caracteres');
    }));
  });

  // =========================
  // 🗑️ ELIMINAR
  // =========================
  describe('al eliminar un mensaje', () => {
    const MENSAJE: any = { id: 'm1', texto: 'x', autorUid: 'u1', autorNombre: 'Ana', creadoEn: new Date() };

    beforeEach(() => listo());

    it('debería impedirlo a quien no es organizador, aunque sea el autor', fakeAsync(() => {
      component.currentUid = 'u1';
      component.onEliminarMensaje(MENSAJE);
      flush();

      expect(ultimoToast().message).toBe('No tienes permisos para eliminar mensajes');
      expect(alertCtrl.create).not.toHaveBeenCalled();
      expect(evento.eliminarMensaje).not.toHaveBeenCalled();
    }));

    it('debería pedir confirmación y eliminar si es el organizador', fakeAsync(() => {
      component.currentUid = 'org1';
      component.onEliminarMensaje(MENSAJE);
      flush();
      expect(evento.eliminarMensaje).withContext('antes de confirmar').not.toHaveBeenCalled();

      const opciones = alertCtrl.create.calls.mostRecent().args[0] as any;
      opciones.buttons.find((b: any) => b.text === 'Eliminar').handler();
      flush();

      expect(evento.eliminarMensaje).toHaveBeenCalledWith('e1', 'm1');
      expect(ultimoToast().message).toBe('Mensaje eliminado');
    }));

    it('debería avisar si el mensaje no tiene id', fakeAsync(() => {
      component.currentUid = 'org1';
      component.onEliminarMensaje({ ...MENSAJE, id: undefined });
      flush();

      expect(ultimoToast().message).toBe('Mensaje inválido');
      expect(alertCtrl.create).not.toHaveBeenCalled();
    }));

    it('debería avisar si falla la eliminación', fakeAsync(() => {
      evento.eliminarMensaje.and.callFake(async () => { throw new Error('permission-denied'); });
      component.currentUid = 'org1';
      component.onEliminarMensaje(MENSAJE);
      flush();

      (alertCtrl.create.calls.mostRecent().args[0] as any).buttons.find((b: any) => b.text === 'Eliminar').handler();
      flush();

      expect(ultimoToast().message).toBe('Error al eliminar el mensaje');
    }));
  });

  describe('obtenerFecha', () => {
    beforeEach(() => listo());

    it('debería convertir Timestamp de Firestore, Date y texto', () => {
      const fecha = new Date('2026-01-01T12:00:00Z');
      expect(component.obtenerFecha({ toDate: () => fecha })).toEqual(fecha);
      expect(component.obtenerFecha(fecha)).toEqual(fecha);
      expect(component.obtenerFecha('2026-01-01T12:00:00Z')).toEqual(fecha);
    });

    it('debería usar la hora actual mientras el servidor no asigna la fecha', fakeAsync(() => {
      expect(component.obtenerFecha(null)!.getTime()).toBe(Date.now());
    }));
  });
});
