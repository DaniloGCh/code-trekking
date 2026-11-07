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

import { LugarService } from './lugar.service';
import { Lugar } from '../models/evento.model';

/**
 * Firestore real, solo en memoria y con la red desactivada. Las escrituras se
 * aplican al instante en la caché local, pero su promesa no termina sin
 * servidor: estas pruebas revisan el resultado en la caché en vez de esperarla.
 * El servicio solo hace CRUD: las validaciones del catálogo están en
 * DashboardPage (dashboard.page.lugar.spec.ts).
 */
describe('LugarService (catálogo de rutas)', () => {
  let app: FirebaseApp;
  let db: FirestoreSdk;
  let service: LugarService;

  const lugar = (extra: Partial<Lugar> = {}): Omit<Lugar, 'id'> => ({
    nombre: 'Cerro La Campana',
    informacion: 'Ascenso clásico de la cordillera de la costa',
    altitud: '1880 m',
    dificultad: 'Media - Alta',
    distanciaKm: 14,
    tiempoEstimadoHoras: '6 h',
    equipamiento: ['Agua (2L a 3L)'],
    DireccionPuntoInicio: 'Sector Granizo',
    requiereRegistroAcceso: true,
    requiereGuiaMontana: false,
    requierePagoEntrada: true,
    valorEntrada: 5000,
    requiereHorarioVisita: false,
    requierePermiso: false,
    requiereMasInformacion: false,
    ...extra
  });

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

  const esperarHasta = async (condicion: () => Promise<boolean>) => {
    for (let i = 0; i < 300; i++) {
      if (await condicion()) return;
      await new Promise(r => setTimeout(r, 5));
    }
    fail('La condición no se cumplió a tiempo');
  };

  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-lugar');
  });

  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);

    TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: db }]
    });
    service = TestBed.inject(LugarService);
  });

  afterEach(async () => {
    await terminate(db);
  });

  it('debería listar los lugares incluyendo el id de cada uno', async () => {
    sembrar('lugares/l1', lugar());
    sembrar('lugares/l2', lugar({ nombre: 'Cajón del Maipo' }));

    const lugares = await firstValueFrom(service.getLugares());

    expect(lugares.map(l => l.id).sort()).toEqual(['l1', 'l2']);
    expect(lugares.find(l => l.id === 'l2')?.nombre).toBe('Cajón del Maipo');
  });

  it('debería devolver una lista vacía si el catálogo no tiene lugares', async () => {
    expect(await firstValueFrom(service.getLugares())).toEqual([]);
  });

  it('debería agregar un lugar nuevo con todos sus datos', async () => {
    service.agregarLugar(lugar()).catch(() => { /* cierre de Firestore */ });

    let guardados: any[] = [];
    await esperarHasta(async () => {
      guardados = (await getDocsFromCache(collection(db, 'lugares'))).docs.map(d => d.data());
      return guardados.length === 1;
    });

    expect(guardados[0].nombre).toBe('Cerro La Campana');
    expect(guardados[0].distanciaKm).toBe(14);
    expect(guardados[0].equipamiento).toEqual(['Agua (2L a 3L)']);
  });

  it('debería editar solo el lugar indicado', async () => {
    sembrar('lugares/l1', lugar());
    sembrar('lugares/l2', lugar({ nombre: 'Otro lugar' }));

    service.editarLugar('l1', lugar({ nombre: 'Nombre corregido', distanciaKm: 15 })).catch(() => { /* cierre de Firestore */ });

    await esperarHasta(async () => (await leer('lugares/l1'))?.nombre === 'Nombre corregido');
    expect((await leer('lugares/l1')).distanciaKm).toBe(15);
    expect((await leer('lugares/l2')).nombre).toBe('Otro lugar');
  });

  it('debería eliminar solo el lugar indicado', async () => {
    sembrar('lugares/l1', lugar());
    sembrar('lugares/l2', lugar());

    service.eliminarLugar('l1').catch(() => { /* cierre de Firestore */ });

    await esperarHasta(async () => (await leer('lugares/l1')) === null);
    expect(await leer('lugares/l2')).not.toBeNull();
  });
});
