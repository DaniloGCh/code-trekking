import { TestBed } from '@angular/core/testing';
import { LogLevel, setLogLevel } from '@angular/fire';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore as FirestoreSdk,
  connectFirestoreEmulator,
  disableNetwork,
  doc,
  initializeFirestore,
  memoryLocalCache,
  setDoc,
  terminate
} from 'firebase/firestore';

import { DatosAceptacionUsuario, TerminosService, TerminosVigentes } from './terminos.service';

describe('TerminosService (términos y condiciones versionados)', () => {

  // =========================
  // 🔢 LÓGICA PURA
  // =========================
  describe('compararVersiones', () => {
    it('debería comparar numéricamente cada parte ("1.10" > "1.9")', () => {
      expect(TerminosService.compararVersiones('1.10', '1.9')).toBeGreaterThan(0);
      expect(TerminosService.compararVersiones('1.9', '1.10')).toBeLessThan(0);
    });

    it('debería considerar iguales versiones con ceros finales ("2" = "2.0.0")', () => {
      expect(TerminosService.compararVersiones('2', '2.0.0')).toBe(0);
      expect(TerminosService.compararVersiones('1.0', '1.0')).toBe(0);
    });

    it('debería detectar versiones de parche mayores', () => {
      expect(TerminosService.compararVersiones('1.0.1', '1.0')).toBeGreaterThan(0);
      expect(TerminosService.compararVersiones('1.0', '2.0')).toBeLessThan(0);
    });
  });

  describe('FORMATO_VERSION', () => {
    it('debería aceptar versiones de 1 a 3 partes numéricas', () => {
      ['1', '1.1', '2.0.1', '10.20.300'].forEach(v =>
        expect(TerminosService.FORMATO_VERSION.test(v)).withContext(v).toBeTrue());
    });

    it('debería rechazar formatos inválidos', () => {
      ['', 'v1', '1.', '1..2', '1.2.3.4', '1.a', '1234'].forEach(v =>
        expect(TerminosService.FORMATO_VERSION.test(v)).withContext(v).toBeFalse());
    });
  });

  describe('evaluación de aceptación', () => {
    let service: TerminosService;
    const vigentes: TerminosVigentes = { version: '1.1', fechaPublicacion: '2026-01-01T00:00:00Z' };

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: Auth, useValue: {} },
          { provide: Firestore, useValue: {} }
        ]
      });
      service = TestBed.inject(TerminosService);
    });

    it('debería indicar que está al día si aceptó exactamente la versión vigente', () => {
      const usuario: DatosAceptacionUsuario = { terminosAceptados: true, versionTerminos: '1.1' };
      expect(service.aceptoVersionVigente(usuario, vigentes)).toBeTrue();
    });

    it('debería exigir re-aceptar si aceptó una versión anterior', () => {
      const usuario: DatosAceptacionUsuario = { terminosAceptados: true, versionTerminos: '1.0' };
      expect(service.aceptoVersionVigente(usuario, vigentes)).toBeFalse();
    });

    it('debería tratar a usuarios antiguos sin versión registrada como aceptantes de la 1.0', () => {
      const usuarioAntiguo: DatosAceptacionUsuario = { terminosAceptados: true };
      expect(service.aceptoVersionVigente(usuarioAntiguo, { version: '1.0', fechaPublicacion: null })).toBeTrue();
      expect(service.aceptoVersionVigente(usuarioAntiguo, vigentes)).toBeFalse();
    });

    it('debería indicar que no aceptó si nunca aceptó o no hay datos', () => {
      expect(service.aceptoVersionVigente({ terminosAceptados: false, versionTerminos: '1.1' }, vigentes)).toBeFalse();
      expect(service.aceptoVersionVigente(null, vigentes)).toBeFalse();
      expect(service.aceptoVersionVigente(undefined, vigentes)).toBeFalse();
    });

    it('debería eximir solo al administrador', () => {
      expect(service.estaExento({ rol: 'admin' })).toBeTrue();
      expect(service.estaExento({ rol: 'user' })).toBeFalse();
      expect(service.estaExento(null)).toBeFalse();
    });
  });

  // =========================
  // 📖 LECTURA / PUBLICACIÓN (Firestore en memoria, sin red)
  // =========================
  describe('con Firestore sin conexión', () => {
    let app: FirebaseApp;
    let db: FirestoreSdk;
    let auth: { currentUser: { uid: string } | null };
    let service: TerminosService;

    const guardarEnCache = (ruta: string, data: any) => {
      setDoc(doc(db, ruta), data).catch(() => { /* queda pendiente: nunca llega al servidor */ });
    };

    const datosPublicacion = (version: string, secciones = [{ numero: '1', titulo: 'Uso', contenido: 'Texto' }]) =>
      ({ version, resumenCambios: 'Cambios', introduccion: 'Intro', secciones });

    // Una app por archivo; tras cada prueba solo se cierra Firestore (borrar la app
    // deja avisos del heartbeat interno de Firebase en la consola)
    beforeAll(() => {
      setLogLevel(LogLevel.SILENT);
      app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-terminos');
    });

    beforeEach(async () => {
      db = initializeFirestore(app, { localCache: memoryLocalCache() });
      connectFirestoreEmulator(db, '127.0.0.1', 1);
      await disableNetwork(db);

      auth = { currentUser: { uid: 'admin1' } };
      spyOn(console, 'warn');

      TestBed.configureTestingModule({
        providers: [
          { provide: Auth, useValue: auth },
          { provide: Firestore, useValue: db }
        ]
      });
      service = TestBed.inject(TerminosService);
    });

    afterEach(async () => {
      await terminate(db);
    });

    it('debería usar la versión base 1.0 si no hay términos publicados o no se pueden leer', async () => {
      const vigentes = await service.obtenerVigentes();
      expect(vigentes).toEqual({ version: '1.0', fechaPublicacion: null, contenido: null });
    });

    it('debería devolver la versión publicada por el administrador', async () => {
      guardarEnCache('configuracion/terminos', { version: '1.3', fechaPublicacion: '2026-02-01T00:00:00Z' });
      const vigentes = await service.obtenerVigentes();
      expect(vigentes.version).toBe('1.3');
    });

    it('debería ignorar un documento publicado sin versión', async () => {
      guardarEnCache('configuracion/terminos', { resumenCambios: 'sin versión' });
      expect((await service.obtenerVigentes()).version).toBe('1.0');
    });

    it('debería no registrar aceptación si no hay sesión', async () => {
      auth.currentUser = null;
      expect(await service.aceptarVersionVigente({ version: '1.1', fechaPublicacion: null })).toBeNull();
    });

    it('debería impedir publicar sin sesión', async () => {
      auth.currentUser = null;
      await expectAsync(service.publicarNuevaVersion(datosPublicacion('2.0')))
        .toBeRejectedWithError('No hay usuario autenticado');
    });

    it('debería rechazar publicar una versión con formato inválido', async () => {
      await expectAsync(service.publicarNuevaVersion(datosPublicacion('v2')))
        .toBeRejectedWithError('version-invalida');
    });

    it('debería rechazar publicar una versión igual o menor a la vigente', async () => {
      guardarEnCache('configuracion/terminos', { version: '1.5', fechaPublicacion: null });
      await expectAsync(service.publicarNuevaVersion(datosPublicacion('1.5')))
        .toBeRejectedWithError('version-no-mayor');
      await expectAsync(service.publicarNuevaVersion(datosPublicacion('1.4.9')))
        .toBeRejectedWithError('version-no-mayor');
    });

    it('debería rechazar publicar una versión sin secciones', async () => {
      await expectAsync(service.publicarNuevaVersion(datosPublicacion('2.0', [])))
        .toBeRejectedWithError('sin-secciones');
    });
  });
});
