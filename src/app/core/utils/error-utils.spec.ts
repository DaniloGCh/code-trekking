import {
  esErrorDeCarga,
  esErrorDeConexion,
  esErrorDePermisosPorSesionCerrada,
  generarCodigoError
} from './error-utils';

describe('error-utils', () => {

  describe('esErrorDeConexion (RNF disponibilidad sin conexión)', () => {
    let online: jasmine.Spy;

    beforeEach(() => {
      online = spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    });

    it('debería considerar cualquier error como de conexión si el dispositivo está offline', () => {
      online.and.returnValue(false);
      expect(esErrorDeConexion(new Error('cualquier cosa'))).toBeTrue();
      expect(esErrorDeConexion(null)).toBeTrue();
    });

    it('debería detectar el código "unavailable" de Firestore', () => {
      expect(esErrorDeConexion({ code: 'unavailable', message: 'x' })).toBeTrue();
    });

    it('debería detectar auth/network-request-failed de Firebase Auth', () => {
      expect(esErrorDeConexion({ code: 'auth/network-request-failed' })).toBeTrue();
    });

    it('debería detectar respuestas HTTP con status 0', () => {
      expect(esErrorDeConexion({ status: 0 })).toBeTrue();
    });

    it('debería detectar mensajes típicos de falta de red', () => {
      expect(esErrorDeConexion(new Error('Failed to get document because the client is offline.'))).toBeTrue();
      expect(esErrorDeConexion(new TypeError('Failed to fetch'))).toBeTrue();
      expect(esErrorDeConexion(new Error('Network Error'))).toBeTrue();
      expect(esErrorDeConexion(new Error('NetworkError when attempting to fetch resource.'))).toBeTrue();
      expect(esErrorDeConexion('client is offline')).toBeTrue();
    });

    it('debería no confundir otros errores con falta de conexión', () => {
      expect(esErrorDeConexion({ code: 'permission-denied', message: 'Missing or insufficient permissions.' })).toBeFalse();
      expect(esErrorDeConexion({ status: 500 })).toBeFalse();
      expect(esErrorDeConexion(new Error('nombre-en-uso'))).toBeFalse();
      expect(esErrorDeConexion(undefined)).toBeFalse();
    });
  });

  describe('esErrorDePermisosPorSesionCerrada', () => {
    it('debería detectar permission-denied por código o por mensaje', () => {
      expect(esErrorDePermisosPorSesionCerrada({ code: 'permission-denied' })).toBeTrue();
      expect(esErrorDePermisosPorSesionCerrada(new Error('Missing or insufficient permissions.'))).toBeTrue();
    });

    it('debería devolver false para otros errores', () => {
      expect(esErrorDePermisosPorSesionCerrada({ code: 'unavailable' })).toBeFalse();
      expect(esErrorDePermisosPorSesionCerrada(null)).toBeFalse();
    });
  });

  describe('esErrorDeCarga', () => {
    it('debería detectar fallas al cargar chunks o módulos', () => {
      expect(esErrorDeCarga(new Error('ChunkLoadError: Loading chunk 12 failed.'))).toBeTrue();
      expect(esErrorDeCarga(new Error('Failed to fetch dynamically imported module: x.js'))).toBeTrue();
      expect(esErrorDeCarga('Load failed')).toBeTrue();
    });

    it('debería devolver false para otros errores', () => {
      expect(esErrorDeCarga(new Error('Cannot read properties of undefined'))).toBeFalse();
      expect(esErrorDeCarga(undefined)).toBeFalse();
    });
  });

  describe('generarCodigoError', () => {
    afterEach(() => jasmine.clock().uninstall());

    it('debería generar un código ERR- con la marca de tiempo en base 36', () => {
      jasmine.clock().install();
      const fecha = new Date('2026-01-01T00:00:00Z');
      jasmine.clock().mockDate(fecha);
      expect(generarCodigoError()).toBe(`ERR-${fecha.getTime().toString(36).toUpperCase()}`);
      expect(generarCodigoError()).toMatch(/^ERR-[0-9A-Z]+$/);
    });
  });
});
