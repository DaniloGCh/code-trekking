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

import { AuthService, SuscripcionData } from './auth.service';
import { SecurityService } from './security.service';

/**
 * Firestore real, solo en memoria y con la red desactivada (apuntando a
 * 127.0.0.1:1): nunca se conecta al proyecto de Firebase. Los documentos
 * se "siembran" en la caché local para simular lo que hay en la base.
 */
describe('AuthService', () => {
  let app: FirebaseApp;
  let db: FirestoreSdk;
  let auth: { currentUser: { uid: string } | null };
  let service: AuthService;
  let security: SecurityService;

  const guardarEnCache = (ruta: string, data: any) => {
    setDoc(doc(db, ruta), data).catch(() => { /* queda pendiente: nunca llega al servidor */ });
  };

  // Una app por archivo; tras cada prueba solo se cierra Firestore (borrar la app
  // deja avisos del heartbeat interno de Firebase en la consola)
  beforeAll(() => {
    setLogLevel(LogLevel.SILENT);
    app = initializeApp({ projectId: 'demo-code-trekking', apiKey: 'fake', appId: 'fake' }, 'pruebas-auth');
  });

  beforeEach(async () => {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    connectFirestoreEmulator(db, '127.0.0.1', 1);
    await disableNetwork(db);

    auth = { currentUser: { uid: 'u1' } };

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: auth },
        { provide: Firestore, useValue: db }
      ]
    });
    service = TestBed.inject(AuthService);
    security = TestBed.inject(SecurityService);
  });

  afterEach(async () => {
    try { jasmine.clock().uninstall(); } catch { /* no estaba instalado */ }
    await terminate(db);
  });

  // =========================
  // 🏷️ NOMBRE DE USUARIO ÚNICO (índice nombresUsuario)
  // =========================
  describe('isNombreDisponible (índice nombresUsuario)', () => {
    beforeEach(() => {
      guardarEnCache('nombresUsuario/ana maría', { uid: 'otro-uid' });
    });

    it('debería indicar no disponible un nombre ya registrado por otro usuario', async () => {
      expect(await service.isNombreDisponible('Ana María')).toBeFalse();
    });

    it('debería ignorar mayúsculas y espacios extra al comparar', async () => {
      expect(await service.isNombreDisponible('  ANA   maría ')).toBeFalse();
    });

    it('debería reconocer tildes escritas en forma descompuesta (teclado móvil)', async () => {
      expect(await service.isNombreDisponible('Ana María')).toBeFalse();
    });

    it('debería considerar disponible el nombre propio (para cambiar solo mayúsculas)', async () => {
      expect(await service.isNombreDisponible('ANA MARÍA', 'otro-uid')).toBeTrue();
    });

    it('debería tratar igual el nombre crudo, el sanitizado y el apóstrofo tipográfico', async () => {
      guardarEnCache(`nombresUsuario/${security.sanitizeInput(`o'higgins`)}`, { uid: 'otro-uid' });

      expect(await service.isNombreDisponible(`O'Higgins`)).toBeFalse();
      expect(await service.isNombreDisponible('O&#x27;Higgins')).toBeFalse();
      expect(await service.isNombreDisponible('O’Higgins')).toBeFalse();
    });

    it('debería no asumir que el nombre está libre si no puede consultar el índice', async () => {
      // Sin red y sin el documento en caché, la consulta falla en vez de responder "disponible"
      await expectAsync(service.isNombreDisponible('Nombre Nuevo')).toBeRejected();
    });
  });

  // =========================
  // 👤 DATOS Y ROL
  // =========================
  describe('getUserRole / getCurrentUserData', () => {
    it('debería devolver el rol guardado en el perfil', async () => {
      guardarEnCache('usuarios/u1', { uid: 'u1', nombre: 'Ana', rol: 'admin' });
      expect(await service.getUserRole()).toBe('admin');
    });

    it('debería devolver null sin sesión, sin consultar Firestore', async () => {
      auth.currentUser = null;
      expect(await service.getUserRole()).toBeNull();
      expect(await service.getCurrentUserData()).toBeNull();
    });

    it('debería devolver los datos del perfil del usuario actual', async () => {
      guardarEnCache('usuarios/u1', { uid: 'u1', nombre: 'Ana', rol: 'user' });
      const datos = await service.getCurrentUserData();
      expect(datos?.nombre).toBe('Ana');
      expect(datos?.rol).toBe('user');
    });
  });

  // =========================
  // 📝 REGISTRO Y LOGIN (validaciones previas a Firebase)
  // =========================
  describe('register (validaciones)', () => {
    const PASSWORD_OK = 'Trekking1!';

    it('debería rechazar un correo inválido', async () => {
      await expectAsync(service.register('correo-malo', PASSWORD_OK, 'Ana', 'user', true))
        .toBeRejectedWithError('invalid-email');
    });

    it('debería rechazar un nombre con contenido peligroso', async () => {
      await expectAsync(service.register('ana@mail.cl', PASSWORD_OK, '<script>x</script>', 'user', true))
        .toBeRejectedWithError('invalid-nombre');
    });

    it('debería rechazar una contraseña débil con el motivo', async () => {
      await expectAsync(service.register('ana@mail.cl', 'debil', 'Ana', 'user', true))
        .toBeRejectedWithError('Mínimo 8 caracteres');
    });

    it('debería exigir aceptar los términos para registrarse', async () => {
      await expectAsync(service.register('ana@mail.cl', PASSWORD_OK, 'Ana', 'user', false))
        .toBeRejectedWithError('terminos-no-aceptados');
    });
  });

  describe('login (RNF seguridad: límite de intentos)', () => {
    it('debería bloquear el sexto intento dentro de un minuto', async () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-01-01T12:00:00Z'));

      // Correo inválido: se cuenta el intento pero no se llama a Firebase
      for (let i = 0; i < 5; i++) {
        await expectAsync(service.login('malo', 'x')).toBeRejectedWithError('invalid-email');
      }
      await expectAsync(service.login('malo', 'x')).toBeRejectedWithError('too-many-attempts');

      jasmine.clock().tick(60001);
      await expectAsync(service.login('malo', 'x')).toBeRejectedWithError('invalid-email');
    });
  });

  // =========================
  // 💳 SUSCRIPCIÓN
  // =========================
  describe('diasRestantesDeGracia', () => {
    const sub = (fechaVencimiento: string): SuscripcionData =>
      ({ activa: true, plan: 'mensual', fechaInicio: '2025-12-10T12:00:00Z', fechaVencimiento });

    beforeEach(() => jasmine.clock().install());

    it('debería devolver null si la suscripción aún no vence', () => {
      jasmine.clock().mockDate(new Date('2026-01-05T12:00:00Z'));
      expect(service.diasRestantesDeGracia(sub('2026-01-10T12:00:00Z'))).toBeNull();
    });

    it('debería contar los días de gracia restantes (5 días tras el vencimiento)', () => {
      jasmine.clock().mockDate(new Date('2026-01-12T12:00:00Z'));
      expect(service.diasRestantesDeGracia(sub('2026-01-10T12:00:00Z'))).toBe(3);

      jasmine.clock().mockDate(new Date('2026-01-10T13:00:00Z'));
      expect(service.diasRestantesDeGracia(sub('2026-01-10T12:00:00Z'))).toBe(5);
    });

    it('debería devolver null una vez terminada la gracia', () => {
      jasmine.clock().mockDate(new Date('2026-01-16T12:00:00Z'));
      expect(service.diasRestantesDeGracia(sub('2026-01-10T12:00:00Z'))).toBeNull();
    });

    it('debería devolver null sin suscripción o con fecha inválida', () => {
      expect(service.diasRestantesDeGracia(null)).toBeNull();
      expect(service.diasRestantesDeGracia(sub('no-es-fecha'))).toBeNull();
    });
  });

  // Firestore usa timers internos, así que aquí no se instala jasmine.clock():
  // las fechas se calculan relativas a "ahora" y el resultado no depende del día.
  describe('verificarYActualizarSuscripcion', () => {
    const DIA_MS = 24 * 60 * 60 * 1000;

    it('debería mantener activa una suscripción dentro del periodo de gracia', async () => {
      const ahora = Date.now();
      const suscripcion = {
        activa: true,
        plan: 'mensual',
        fechaInicio: new Date(ahora - 32 * DIA_MS).toISOString(),
        fechaVencimiento: new Date(ahora - 2 * DIA_MS).toISOString()
      };
      guardarEnCache('usuarios/u1', { uid: 'u1', suscripcion });

      expect(await service.verificarYActualizarSuscripcion()).toEqual(suscripcion as SuscripcionData);
    });

    it('debería devolver null si el usuario no tiene suscripción', async () => {
      guardarEnCache('usuarios/u1', { uid: 'u1' });
      expect(await service.verificarYActualizarSuscripcion()).toBeNull();
    });

    it('debería devolver null sin sesión', async () => {
      auth.currentUser = null;
      expect(await service.verificarYActualizarSuscripcion()).toBeNull();
    });
  });
});
