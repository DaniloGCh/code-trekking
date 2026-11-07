import { TestBed } from '@angular/core/testing';

import { PuntoRuta, TrackingService } from './tracking.service';

/**
 * Se prueba en el navegador (Capacitor.isNativePlatform() = false):
 * el GPS se simula con un spy de navigator.geolocation y la descarga del
 * GPX se intercepta, así que no se toca hardware ni se crean archivos.
 */
describe('TrackingService (registro de ruta y exportación GPX)', () => {
  let service: TrackingService;

  const T0 = new Date('2026-01-01T12:00:00Z').getTime();

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrackingService);
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(T0));
  });

  afterEach(async () => {
    await service.detenerTracking();
    jasmine.clock().uninstall();
  });

  /** Carga puntos directamente en el estado (como si se hubieran registrado). */
  const cargarPuntos = (puntos: PuntoRuta[]) =>
    (service as any).estado.next({ ...service.estadoActual, puntos });

  // =========================
  // 📦 EXPORTAR GPX
  // =========================
  describe('exportarGPX', () => {
    let blobGenerado: Blob | null;
    let enlace: HTMLAnchorElement | null;

    beforeEach(() => {
      blobGenerado = null;
      enlace = null;
      spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => {
        blobGenerado = b as Blob;
        return 'blob:prueba';
      });
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        enlace = this;
      });
    });

    const leerGpx = async () => {
      const texto = await blobGenerado!.text();
      return { texto, xml: new DOMParser().parseFromString(texto, 'application/xml') };
    };

    it('debería lanzar un error si no hay puntos de ruta', async () => {
      await expectAsync(service.exportarGPX()).toBeRejectedWithError('No hay puntos de ruta para exportar');
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('debería generar un XML GPX 1.1 válido con un trkpt por cada punto', async () => {
      cargarPuntos([
        { lat: -33.4489, lng: -70.6693, timestamp: T0 },
        { lat: -33.4490, lng: -70.6694, timestamp: T0 + 5000 },
        { lat: -33.4491, lng: -70.6695, timestamp: T0 + 10000 }
      ]);

      await service.exportarGPX();
      const { texto, xml } = await leerGpx();

      expect(texto.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBeTrue();
      expect(xml.getElementsByTagName('parsererror').length).withContext('XML mal formado').toBe(0);

      const raiz = xml.documentElement;
      expect(raiz.localName).toBe('gpx');
      expect(raiz.getAttribute('version')).toBe('1.1');
      expect(raiz.namespaceURI).toBe('http://www.topografix.com/GPX/1/1');

      const trkpts = Array.from(xml.getElementsByTagName('trkpt'));
      expect(trkpts.length).toBe(3);
      expect(trkpts[0].getAttribute('lat')).toBe('-33.4489');
      expect(trkpts[0].getAttribute('lon')).toBe('-70.6693');
      expect(trkpts[2].getAttribute('lat')).toBe('-33.4491');
      expect(trkpts[1].getElementsByTagName('time')[0].textContent).toBe('2026-01-01T12:00:05.000Z');
      expect(xml.getElementsByTagName('name')[0].textContent).toBe('Ruta Trekking');
    });

    it('debería descargar el archivo con extensión .gpx y tipo application/gpx+xml', async () => {
      cargarPuntos([{ lat: -33.4, lng: -70.6, timestamp: T0 }]);

      await service.exportarGPX();

      expect(blobGenerado!.type).toBe('application/gpx+xml');
      expect(enlace).not.toBeNull();
      expect(enlace!.download).toBe(`ruta-trekking-${T0}.gpx`);
      expect(enlace!.href).toBe('blob:prueba');
      expect(enlace!.isConnected).toBeFalse(); // el enlace temporal se quita del DOM
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:prueba');
    });
  });

  // =========================
  // 📡 REGISTRO DE PUNTOS (GPS simulado)
  // =========================
  describe('iniciarTracking (filtros del GPS en web)', () => {
    let emitirPosicion: (lat: number, lng: number, accuracy?: number) => void;

    beforeEach(() => {
      spyOn(navigator.geolocation, 'watchPosition').and.callFake((exito: PositionCallback) => {
        emitirPosicion = (lat, lng, accuracy = 10) =>
          exito({ coords: { latitude: lat, longitude: lng, accuracy } } as GeolocationPosition);
        return 42;
      });
      spyOn(navigator.geolocation, 'clearWatch');
    });

    it('debería activar el tracking y registrar el primer punto preciso', async () => {
      await service.iniciarTracking();
      emitirPosicion(-33.0, -70.0);

      expect(service.estadoActual.activo).toBeTrue();
      expect(service.estadoActual.puntos.length).toBe(1);
      expect(service.estadoActual.posicionActual).toEqual({ lat: -33.0, lng: -70.0 });
    });

    it('debería descartar lecturas con precisión peor a 30 m', async () => {
      await service.iniciarTracking();
      emitirPosicion(-33.0, -70.0, 50);
      expect(service.estadoActual.puntos.length).toBe(0);
    });

    it('debería sumar la distancia de un desplazamiento válido (~11 m)', async () => {
      await service.iniciarTracking();
      emitirPosicion(-33.0, -70.0);
      jasmine.clock().tick(2000);
      emitirPosicion(-33.0001, -70.0); // 0.0001° de latitud ≈ 11,1 m

      expect(service.estadoActual.puntos.length).toBe(2);
      expect(service.estadoActual.distanciaTotal).toBeCloseTo(11.12, 1);
    });

    it('debería ignorar ruido: movimientos < 5 m, saltos > 80 m o lecturas en menos de 1 s', async () => {
      await service.iniciarTracking();
      emitirPosicion(-33.0, -70.0);

      jasmine.clock().tick(2000);
      emitirPosicion(-33.00001, -70.0);  // ~1 m
      emitirPosicion(-33.001, -70.0);    // ~111 m

      jasmine.clock().tick(500);
      // Válido en distancia pero el último punto aceptado sigue siendo el inicial
      // y ya pasaron 2,5 s → se acepta
      emitirPosicion(-33.0001, -70.0);
      expect(service.estadoActual.puntos.length).toBe(2);

      jasmine.clock().tick(500);         // solo 0,5 s desde el último aceptado
      emitirPosicion(-33.0002, -70.0);
      expect(service.estadoActual.puntos.length).toBe(2);
    });

    it('debería contar el tiempo transcurrido cada segundo', async () => {
      await service.iniciarTracking();
      jasmine.clock().tick(3000);
      expect(service.estadoActual.tiempoSegundos).toBe(3);
    });

    it('debería no iniciar dos veces el tracking', async () => {
      await service.iniciarTracking();
      await service.iniciarTracking();
      expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(1);
    });

    it('debería detener el GPS y el contador al finalizar', async () => {
      await service.iniciarTracking();
      await service.detenerTracking();
      jasmine.clock().tick(3000);

      expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(42);
      expect(service.estadoActual.activo).toBeFalse();
      expect(service.estadoActual.tiempoSegundos).toBe(0);
    });

    it('debería limpiar la ruta conservando la posición actual', async () => {
      await service.iniciarTracking();
      emitirPosicion(-33.0, -70.0);
      jasmine.clock().tick(2000);

      await service.limpiarRuta();

      expect(service.estadoActual).toEqual({
        activo: false,
        puntos: [],
        distanciaTotal: 0,
        tiempoSegundos: 0,
        posicionActual: { lat: -33.0, lng: -70.0 }
      });
    });
  });

  describe('ruta trazada', () => {
    it('debería guardar y limpiar la ruta trazada en el mapa', () => {
      service.guardarRutaTrazada([{ lat: 1, lng: 2 }], [{ instruccion: 'Gira', distancia: '10 m' }], 'bike', [{ lat: 1, lng: 2 }]);
      expect(service.estadoRutaActual.activa).toBeTrue();
      expect(service.estadoRutaActual.perfilRuta).toBe('bike');

      service.limpiarRutaTrazada();
      expect(service.estadoRutaActual).toEqual({
        activa: false, puntos: [], instrucciones: [], perfilRuta: 'hike', puntosMarcados: []
      });
    });
  });
});
