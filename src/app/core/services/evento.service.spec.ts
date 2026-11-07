import { TestBed } from '@angular/core/testing';
import { LogLevel, setLogLevel } from '@angular/fire';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore as FirestoreSdk,
  collection,
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  getDocFromCache,
  getDocsFromCache,
  initializeFirestore,
  memoryLocalCache,
  setDoc,
  terminate
} from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

import { EventoService } from './evento.service';

describe('EventoService (código de invitación)', () => {
  let service: EventoService;

  /** generarCodigo es privado: se accede solo para la prueba. */
  const generarCodigo = (): string => (service as any).generarCodigo();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: {} }
      ]
    });
    service = TestBed.inject(EventoService);
  });

  it('debería generar códigos con formato TRK-XXXXXX (mayúsculas y dígitos)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigo()).toMatch(/^TRK-[A-Z0-9]{6}$/);
    }
  });

  it('debería usar todo el alfabeto según el valor aleatorio', () => {
    const random = spyOn(Math, 'random');

    random.and.returnValue(0);
    expect(generarCodigo()).toBe('TRK-AAAAAA');

    random.and.returnValue(0.9999);
    expect(generarCodigo()).toBe('TRK-999999');

    random.and.returnValues(0, 1 / 36, 25 / 36, 26 / 36, 35 / 36, 0.5);
    expect(generarCodigo()).toBe('TRK-ABZ09S');
  });

  it('debería generar códigos distintos en llamadas sucesivas', () => {
    const codigos = new Set(Array.from({ length: 50 }, () => generarCodigo()));
    expect(codigos.size).toBeGreaterThan(45);
  });
});

/**
 * Firestore real, solo en memoria y con la red desactivada: nunca se conecta al
 * proyecto. Sin servidor, una escritura se aplica al instante en la caché local
 * pero su promesa no termina, así que estas pruebas no la esperan: revisan el
 * documento resultante en la caché.
 */
describe('EventoService con Firestore en memoria (sin red)', () => {
  let app: FirebaseApp;
  let db: FirestoreSdk;
  let auth: { currentUser: { uid: string } | null; onAuthStateChanged: jasmine.Spy };
  let service: EventoService;

  const DIA_MS = 24 * 60 * 60 * 1000;
  const CODIGO = 'TRK-ABC123';

  const sembrar = (ruta: string, data: any) => {
    setDoc(doc(db, ruta), data).catch(() => { /* queda pendiente: nunca llega al servidor */ });
  };

  const leer = async (ruta: string): Promise<any> => {
    try {
      const snap = await getDocFromCache(doc(db, ruta));
      return snap.exists() ? snap.data() : null;
    } catch {
      return null;
    }
  };

  /** Lanza la operación sin esperarla (su escritura queda pendiente). */
  const sinEsperar = (operacion: Promise<unknown>) => { operacion.catch(() => { /* cierre de Firestore */ }); };

  /** Espera a que la escritura local se vea en la caché. */
  const esperarHasta = async (condicion: () => Promise<boolean>) => {
    for (let i = 0; i < 300; i++) {
      if (await condicion()) return;
      await new Promise(r => setTimeout(r, 5));
    }
    fail('La condición no se cumplió a tiempo');
  };

  const eventoBase = (extra: any = {}) => ({
    nombre: 'Cerro La Campana',
    codigoInvitacion: CODIGO,
    fecha: new Date(Date.now() + DIA_MS),
    creadoPor: { uid: 'org1', nombre: 'Organizador' },
    participantes: ['org1'],
    participantesInfo: [{ uid: 'org1', nombre: 'Organizador' }],
    ...extra
  });

  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-evento');
  });

  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);

    auth = {
      currentUser: { uid: 'u2' },
      onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.callFake((cb: any) => {
        cb(auth.currentUser);
        return () => { /* sin listener real */ };
      })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: db },
        { provide: Auth, useValue: auth }
      ]
    });
    service = TestBed.inject(EventoService);
  });

  afterEach(async () => {
    await terminate(db);
  });

  // =========================
  // ➕ CREAR
  // =========================
  describe('crearEvento', () => {
    const datos: any = { nombre: 'Salida', descripcion: 'Descripción', fecha: new Date(), hora: '08:00', lugarId: 'l1', privado: true };

    it('debería exigir una sesión activa', async () => {
      auth.currentUser = null;
      await expectAsync(service.crearEvento(datos)).toBeRejectedWithError('No hay usuario autenticado');
    });

    it('debería guardar el evento con código TRK-XXXXXX y el creador como primer participante', async () => {
      sembrar('usuarios/u2', { nombre: 'Ana' });
      sinEsperar(service.crearEvento(datos));

      let eventos: any[] = [];
      await esperarHasta(async () => {
        eventos = (await getDocsFromCache(collection(db, 'eventos'))).docs.map(d => d.data());
        return eventos.length === 1;
      });

      expect(eventos[0].codigoInvitacion).toMatch(/^TRK-[A-Z0-9]{6}$/);
      expect(eventos[0].participantes).toEqual(['u2']);
      expect(eventos[0].participantesInfo).toEqual([{ uid: 'u2', nombre: 'Ana' }]);
      expect(eventos[0].nombre).toBe('Salida');
    });

    it('debería asignar un código nuevo a cada evento creado', async () => {
      sembrar('usuarios/u2', { nombre: 'Ana' });
      sinEsperar(service.crearEvento(datos));
      sinEsperar(service.crearEvento(datos));

      let codigos: string[] = [];
      await esperarHasta(async () => {
        codigos = (await getDocsFromCache(collection(db, 'eventos'))).docs.map(d => d.data()['codigoInvitacion']);
        return codigos.length === 2;
      });

      expect(codigos[0]).not.toBe(codigos[1]);
    });

    it('debería usar "Usuario" si el perfil no tiene nombre', async () => {
      sembrar('usuarios/u2', { rol: 'user' });
      sinEsperar(service.crearEvento(datos));

      let eventos: any[] = [];
      await esperarHasta(async () => {
        eventos = (await getDocsFromCache(collection(db, 'eventos'))).docs.map(d => d.data());
        return eventos.length === 1;
      });

      expect(eventos[0].participantesInfo).toEqual([{ uid: 'u2', nombre: 'Usuario' }]);
    });
  });

  // =========================
  // 🔗 UNIRSE CON CÓDIGO
  // =========================
  describe('unirseConCodigo', () => {
    beforeEach(() => {
      sembrar('usuarios/u2', { nombre: 'Ana' });
    });

    it('debería exigir una sesión activa', async () => {
      auth.currentUser = null;
      await expectAsync(service.unirseConCodigo(CODIGO)).toBeRejectedWithError('No hay usuario autenticado');
    });

    it('debería rechazar un código que no existe', async () => {
      sembrar('eventos/e1', eventoBase());
      await expectAsync(service.unirseConCodigo('TRK-NOEXIS')).toBeRejectedWithError('codigo-invalido');
    });

    it('debería agregar al usuario sin quitar a los participantes actuales', async () => {
      sembrar('eventos/e1', eventoBase());
      sinEsperar(service.unirseConCodigo(CODIGO));

      await esperarHasta(async () => (await leer('eventos/e1'))?.participantes.includes('u2'));

      const evento = await leer('eventos/e1');
      expect(evento.participantes).toEqual(['org1', 'u2']);
      expect(evento.participantesInfo).toContain({ uid: 'u2', nombre: 'Ana' });
      expect(evento.participantesInfo.length).toBe(2);
    });

    it('debería aceptar el código en minúsculas y con espacios', async () => {
      sembrar('eventos/e1', eventoBase());
      sinEsperar(service.unirseConCodigo('  trk-abc123 '));

      await esperarHasta(async () => (await leer('eventos/e1'))?.participantes.includes('u2'));
      expect((await leer('eventos/e1')).participantes).toContain('u2');
    });

    it('debería rechazar a quien ya es participante, sin modificar el evento', async () => {
      sembrar('eventos/e1', eventoBase({ participantes: ['org1', 'u2'] }));

      await expectAsync(service.unirseConCodigo(CODIGO)).toBeRejectedWithError('ya-participante');
      expect((await leer('eventos/e1')).participantes).toEqual(['org1', 'u2']);
    });

    it('debería rechazar al organizador que usa su propio código', async () => {
      auth.currentUser = { uid: 'org1' };
      sembrar('eventos/e1', eventoBase());
      await expectAsync(service.unirseConCodigo(CODIGO)).toBeRejectedWithError('ya-participante');
    });

    it('debería rechazar un evento que ya finalizó', async () => {
      sembrar('eventos/e1', eventoBase({ fecha: new Date(Date.now() - DIA_MS) }));

      await expectAsync(service.unirseConCodigo(CODIGO)).toBeRejectedWithError('evento-finalizado');
      expect((await leer('eventos/e1')).participantes).toEqual(['org1']);
    });

    it('debería interpretar también fechas guardadas como texto', async () => {
      sembrar('eventos/e1', eventoBase({ fecha: new Date(Date.now() - DIA_MS).toISOString() }));
      await expectAsync(service.unirseConCodigo(CODIGO)).toBeRejectedWithError('evento-finalizado');
    });
  });

  // =========================
  // 🗑️ ELIMINAR / 🚪 SALIR
  // =========================
  describe('eliminarEvento (organizador vs. participante)', () => {
    it('debería exigir una sesión activa', async () => {
      auth.currentUser = null;
      await expectAsync(service.eliminarEvento('e1')).toBeRejectedWithError('No hay usuario autenticado');
    });

    it('debería impedir que un participante elimine el evento', async () => {
      sembrar('eventos/e1', eventoBase({ participantes: ['org1', 'u2'] }));

      await expectAsync(service.eliminarEvento('e1')).toBeRejectedWithError('No tienes permiso para eliminar este evento');
      expect(await leer('eventos/e1')).not.toBeNull();
    });

    it('debería permitir que el organizador elimine el evento', async () => {
      auth.currentUser = { uid: 'org1' };
      sembrar('eventos/e1', eventoBase());
      sinEsperar(service.eliminarEvento('e1'));

      await esperarHasta(async () => (await leer('eventos/e1')) === null);
      expect(await leer('eventos/e1')).toBeNull();
    });
  });

  describe('salirEvento', () => {
    it('debería quitar solo al usuario indicado de los participantes', async () => {
      sembrar('eventos/e1', eventoBase({ participantes: ['org1', 'u2', 'u3'] }));
      sinEsperar(service.salirEvento('e1', 'u2'));

      await esperarHasta(async () => !(await leer('eventos/e1')).participantes.includes('u2'));
      expect((await leer('eventos/e1')).participantes).toEqual(['org1', 'u3']);
    });
  });

  // =========================
  // 📌 LECTURAS
  // =========================
  describe('lecturas', () => {
    it('debería devolver el evento por id incluyendo su id', async () => {
      sembrar('eventos/e1', eventoBase());
      const evento = await service.getEventoById('e1');
      expect(evento?.id).toBe('e1');
      expect(evento?.nombre).toBe('Cerro La Campana');
    });

    it('debería listar solo los eventos en que participa el usuario', async () => {
      sembrar('eventos/e1', eventoBase({ participantes: ['org1', 'u2'] }));
      sembrar('eventos/e2', eventoBase({ participantes: ['org1'] }));

      const eventos = await firstValueFrom(service.getMisEventos());

      expect(eventos.map(e => e.id)).toEqual(['e1']);
    });

    it('debería devolver una lista vacía sin sesión', async () => {
      auth.currentUser = null;
      sembrar('eventos/e1', eventoBase());

      expect(await firstValueFrom(service.getMisEventos())).toEqual([]);
    });
  });

  // =========================
  // 💬 FORO
  // =========================
  describe('foro del evento', () => {
    const FORO = 'eventos/e1/foro';

    it('debería guardar el mensaje con la fecha del servidor y no la del dispositivo', async () => {
      sembrar('eventos/e1', eventoBase());
      sinEsperar(service.enviarMensaje('e1', {
        texto: 'Hola',
        autorUid: 'u2',
        autorNombre: 'Ana',
        creadoEn: new Date('2000-01-01T00:00:00Z')
      }));

      let mensajes: any[] = [];
      await esperarHasta(async () => {
        mensajes = (await getDocsFromCache(collection(db, FORO))).docs.map(d => d.data({ serverTimestamps: 'estimate' }));
        return mensajes.length === 1;
      });

      expect(mensajes[0].texto).toBe('Hola');
      expect(mensajes[0].autorUid).toBe('u2');
      expect(mensajes[0].creadoEn.toDate().getFullYear()).not.toBe(2000);
    });

    it('debería entregar los mensajes del más antiguo al más nuevo', async () => {
      sembrar(`${FORO}/b`, { texto: 'segundo', creadoEn: new Date(2000) });
      sembrar(`${FORO}/a`, { texto: 'primero', creadoEn: new Date(1000) });
      sembrar(`${FORO}/c`, { texto: 'tercero', creadoEn: new Date(3000) });

      const mensajes = await service.getMensajesForo('e1');
      expect(mensajes.map(m => m.texto)).toEqual(['primero', 'segundo', 'tercero']);

      const enVivo = await firstValueFrom(service.getMensajesForoRealtime('e1'));
      expect(enVivo.map(m => m.id)).toEqual(['a', 'b', 'c']);
    });

    it('debería eliminar un mensaje', async () => {
      sembrar(`${FORO}/m1`, { texto: 'borrar', creadoEn: new Date() });
      sinEsperar(service.eliminarMensaje('e1', 'm1'));

      await esperarHasta(async () => (await leer(`${FORO}/m1`)) === null);
      expect(await leer(`${FORO}/m1`)).toBeNull();
    });

    describe('contarMensajesNuevos', () => {
      const visita = new Date('2026-01-10T12:00:00Z');

      beforeEach(() => {
        sembrar(`${FORO}/antiguo`, { autorUid: 'otro', creadoEn: new Date('2026-01-09T12:00:00Z') });
        sembrar(`${FORO}/nuevo1`, { autorUid: 'otro', creadoEn: new Date('2026-01-11T12:00:00Z') });
        sembrar(`${FORO}/nuevo2`, { autorUid: 'otro', creadoEn: '2026-01-12T12:00:00Z' });
        sembrar(`${FORO}/propio`, { autorUid: 'u2', creadoEn: new Date('2026-01-11T12:00:00Z') });
        sembrar(`${FORO}/sinFecha`, { autorUid: 'otro' });
      });

      it('debería contar solo mensajes ajenos posteriores a la última visita', async () => {
        const getItem = spyOn(localStorage, 'getItem').and.returnValue(visita.toISOString());

        expect(await service.contarMensajesNuevos('e1', 'u2')).toBe(2);
        expect(getItem).toHaveBeenCalledWith('foro_ultima_visita_e1_u2');
      });

      it('debería contar todos los mensajes ajenos con fecha si nunca visitó el foro', async () => {
        spyOn(localStorage, 'getItem').and.returnValue(null);
        expect(await service.contarMensajesNuevos('e1', 'u2')).toBe(3);
      });
    });

    it('debería registrar la visita al foro y avisar al resto de la app', () => {
      const setItem = spyOn(localStorage, 'setItem');
      const avisos = jasmine.createSpy('avisos');
      const sub = service.foroVisto$.subscribe(avisos);
      avisos.calls.reset(); // descarta el valor inicial del BehaviorSubject

      service.marcarForoVisto('e1', 'u2');

      expect(setItem).toHaveBeenCalledWith('foro_ultima_visita_e1_u2', jasmine.any(String));
      expect(avisos).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
    });
  });
});
