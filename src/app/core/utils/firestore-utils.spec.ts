import { LogLevel, setLogLevel } from '@angular/fire';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore,
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  initializeFirestore,
  memoryLocalCache,
  setDoc,
  terminate
} from 'firebase/firestore';

import { leerDocPreferirServidor } from './firestore-utils';
import { esErrorDeConexion } from './error-utils';

/**
 * Firestore real, pero solo en memoria y con la red desactivada:
 * nunca se conecta al proyecto de Firebase (ni a internet). Además se
 * apunta a 127.0.0.1:1 por si algo intentara abrir conexión.
 * El servidor "no responde", así que se prueba el respaldo con la caché.
 */
describe('firestore-utils: leerDocPreferirServidor (RNF disponibilidad sin conexión)', () => {
  let app: FirebaseApp;
  let db: Firestore;

  // Una app por archivo; tras cada prueba solo se cierra Firestore (borrar la app
  // deja avisos del heartbeat interno de Firebase en la consola). Las funciones se
  // llaman fuera de un contexto de inyección: se silencian los avisos de AngularFire.
  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-fsutils');
  });

  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);
  });

  afterEach(async () => {
    await terminate(db);
  });

  /** Guarda el documento solo en la caché local (la escritura nunca llega al servidor). */
  const guardarEnCache = (ruta: string, data: any) => {
    setDoc(doc(db, ruta), data).catch(() => { /* queda pendiente: nunca llega al servidor */ });
  };

  it('debería usar la copia en caché si el servidor no responde (con internet)', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    guardarEnCache('usuarios/u1', { nombre: 'Ana', rol: 'user' });

    const snap = await leerDocPreferirServidor(doc(db, 'usuarios/u1'));

    expect(snap.exists()).toBeTrue();
    expect(snap.data()).toEqual({ nombre: 'Ana', rol: 'user' });
    expect(snap.metadata.fromCache).toBeTrue();
  });

  it('debería leer desde la caché directamente si el dispositivo está sin internet', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);
    guardarEnCache('configuracion/terminos', { version: '1.2' });

    const snap = await leerDocPreferirServidor(doc(db, 'configuracion/terminos'));

    expect(snap.exists()).toBeTrue();
    expect(snap.get('version')).toBe('1.2');
    expect(snap.metadata.fromCache).toBeTrue();
  });

  it('debería rechazar con un error de conexión si el documento no está en caché y no hay red', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);

    let error: any = null;
    try {
      await leerDocPreferirServidor(doc(db, 'usuarios/no-existe'));
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.code).toBe('unavailable');
    // La app lo clasifica como "Sin conexión" y no como bug
    expect(esErrorDeConexion(error)).toBeTrue();
  });
});
