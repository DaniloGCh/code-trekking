import { TestBed } from '@angular/core/testing';
import { LogLevel, setLogLevel } from '@angular/fire';
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

import { FotoGaleria, GaleriaFotosService } from './galeria-fotos.service';

/**
 * Firestore real, solo en memoria y con la red desactivada. Las escrituras se
 * aplican al instante en la caché local, pero su promesa no termina sin
 * servidor: estas pruebas revisan el resultado en la caché en vez de esperarla.
 */
describe('GaleriaFotosService (galería por usuario)', () => {
  let app: FirebaseApp;
  let db: FirestoreSdk;
  let service: GaleriaFotosService;

  const foto = (uid: string, fechaSubida: string): FotoGaleria =>
    ({ uid, nombreUsuario: 'Ana', imageUrl: 'data:image/jpeg;base64,AAAA', fechaSubida });

  const sembrar = (ruta: string, data: any) => {
    setDoc(doc(db, ruta), data).catch(() => { /* queda pendiente: nunca llega al servidor */ });
  };

  const esperarHasta = async (condicion: () => Promise<boolean>) => {
    for (let i = 0; i < 300; i++) {
      if (await condicion()) return;
      await new Promise(r => setTimeout(r, 5));
    }
    fail('La condición no se cumplió a tiempo');
  };

  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-galeria');
  });

  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);

    TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: db }]
    });
    service = TestBed.inject(GaleriaFotosService);
  });

  afterEach(async () => {
    await terminate(db);
  });

  it('debería entregar solo las fotos del usuario, de la más nueva a la más antigua', async () => {
    sembrar('galeriaFotos/a', foto('u1', '2026-01-01T00:00:00Z'));
    sembrar('galeriaFotos/b', foto('u1', '2026-03-01T00:00:00Z'));
    sembrar('galeriaFotos/c', foto('u1', '2026-02-01T00:00:00Z'));
    sembrar('galeriaFotos/otro', foto('u2', '2026-04-01T00:00:00Z'));

    const fotos = await firstValueFrom(service.obtenerFotosUsuario('u1'));

    expect(fotos.map(f => f.id)).toEqual(['b', 'c', 'a']);
  });

  it('debería devolver una lista vacía si el usuario no tiene fotos', async () => {
    sembrar('galeriaFotos/otro', foto('u2', '2026-04-01T00:00:00Z'));
    expect(await firstValueFrom(service.obtenerFotosUsuario('u1'))).toEqual([]);
  });

  it('debería guardar la foto subida en la colección galeriaFotos', async () => {
    service.subirFoto(foto('u1', '2026-01-01T00:00:00Z')).catch(() => { /* cierre de Firestore */ });

    let guardadas: any[] = [];
    await esperarHasta(async () => {
      guardadas = (await getDocsFromCache(collection(db, 'galeriaFotos'))).docs.map(d => d.data());
      return guardadas.length === 1;
    });

    expect(guardadas[0]).toEqual(foto('u1', '2026-01-01T00:00:00Z') as any);
  });

  it('debería eliminar solo la foto indicada', async () => {
    sembrar('galeriaFotos/a', foto('u1', '2026-01-01T00:00:00Z'));
    sembrar('galeriaFotos/b', foto('u1', '2026-02-01T00:00:00Z'));

    service.eliminarFoto('a').catch(() => { /* cierre de Firestore */ });

    await esperarHasta(async () => (await getDocsFromCache(collection(db, 'galeriaFotos'))).size === 1);
    expect((await getDocFromCache(doc(db, 'galeriaFotos/b'))).exists()).toBeTrue();
  });
});
