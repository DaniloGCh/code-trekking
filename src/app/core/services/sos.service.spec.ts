import { TestBed } from '@angular/core/testing';
import { GeolocationWeb } from '@capacitor/geolocation/dist/esm/web';

import { SosService, UbicacionSOS } from './sos.service';
import { UserData } from './auth.service';

describe('SosService (alerta SOS)', () => {
  let service: SosService;

  const usuario = { uid: 'u1', email: 'ana@mail.cl', nombre: 'Ana Pérez', rol: 'user' } as UserData;
  const ubicacion: UbicacionSOS = {
    latitud: -33.4489123456,
    longitud: -70.6693987654,
    precision: 12.6,
    timestamp: new Date('2026-01-01T15:30:45Z')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SosService);
  });

  describe('construirMensajeSOS', () => {
    it('debería incluir el nombre de la persona y el aviso a Carabineros/Bomberos', () => {
      const mensaje = service.construirMensajeSOS(usuario, ubicacion);
      expect(mensaje).toContain('ALERTA DE EMERGENCIA');
      expect(mensaje).toContain('👤 Persona: Ana Pérez');
      expect(mensaje).toContain('131 (Carabineros)');
      expect(mensaje).toContain('132 (Bomberos)');
    });

    it('debería incluir las coordenadas con 6 decimales, la precisión y el enlace a Google Maps', () => {
      const mensaje = service.construirMensajeSOS(usuario, ubicacion);
      expect(mensaje).toContain('Lat: -33.448912');
      expect(mensaje).toContain('Lon: -70.669399');
      expect(mensaje).toContain('Precisión: ±13m');
      expect(mensaje).toContain('https://maps.google.com/?q=-33.4489123456,-70.6693987654');
    });

    it('debería incluir la fecha y la hora de la ubicación', () => {
      const mensaje = service.construirMensajeSOS(usuario, ubicacion);
      const fecha = ubicacion.timestamp.toLocaleDateString('es-CL');
      expect(mensaje).toContain(`📅 Fecha: ${fecha}`);
      expect(mensaje).toMatch(/⏰ Hora: \d{2}:\d{2}:\d{2}/);
    });

    it('debería incluir el evento solo si se indica', () => {
      expect(service.construirMensajeSOS(usuario, ubicacion, 'Cerro La Campana'))
        .toContain('🏔️ Evento: Cerro La Campana');
      expect(service.construirMensajeSOS(usuario, ubicacion)).not.toContain('Evento:');
    });

    it('debería omitir el evento si el nombre viene vacío', () => {
      expect(service.construirMensajeSOS(usuario, ubicacion, '')).not.toContain('Evento:');
    });

    it('debería mostrar el evento antes de la fecha y la ubicación después de la hora', () => {
      const mensaje = service.construirMensajeSOS(usuario, ubicacion, 'Cerro La Campana');
      expect(mensaje.indexOf('Evento:')).toBeLessThan(mensaje.indexOf('Fecha:'));
      expect(mensaje.indexOf('Hora:')).toBeLessThan(mensaje.indexOf('Ubicación GPS:'));
    });

    it('debería mostrar precisión 0 si el GPS no la informa', () => {
      expect(service.construirMensajeSOS(usuario, { ...ubicacion, precision: 0 })).toContain('Precisión: ±0m');
    });
  });

  describe('envío', () => {
    beforeEach(() => spyOn(window, 'open'));

    it('debería abrir WhatsApp con el número limpio y el mensaje codificado', () => {
      service.enviarSosPorWhatsApp('+56 9 1234-5678', 'Ayuda & ubicación');
      expect(window.open).toHaveBeenCalledWith(
        `https://wa.me/56912345678?text=${encodeURIComponent('Ayuda & ubicación')}`, '_system');
    });

    it('debería separar varios teléfonos con ";" en Android para el SMS', () => {
      spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (Linux; Android 14)');
      service.enviarSosPorSMS('+56911111111,+56922222222', 'SOS');
      expect(window.open).toHaveBeenCalledWith('sms:+56911111111;+56922222222?body=SOS', '_system');
    });

    it('debería separar varios teléfonos con "," fuera de Android para el SMS', () => {
      spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)');
      service.enviarSosPorSMS('+56911111111,+56922222222', 'SOS');
      expect(window.open).toHaveBeenCalledWith('sms:+56911111111,+56922222222?body=SOS', '_system');
    });

    it('debería codificar el mensaje del SMS para que el enlace no se corte', () => {
      spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (Linux; Android 14)');
      service.enviarSosPorSMS('+56911111111', 'Lat: 1 & Lon: 2\nhttps://maps.google.com/?q=1,2');

      const enlace = (window.open as jasmine.Spy).calls.mostRecent().args[0] as string;
      expect(enlace).not.toContain('\n');
      expect(decodeURIComponent(enlace.split('?body=')[1])).toBe('Lat: 1 & Lon: 2\nhttps://maps.google.com/?q=1,2');
    });
  });

  it('debería no hacer nada al detener un watcher inexistente', async () => {
    await expectAsync(service.detenerWatchUbicacion(null)).toBeResolved();
  });

  // =========================
  // 📍 GPS (plugin simulado, sin tocar el hardware)
  // =========================
  describe('ubicación', () => {
    let checkPermissions: jasmine.Spy;
    let requestPermissions: jasmine.Spy;
    let getCurrentPosition: jasmine.Spy;

    const posicion = (latitude: number, longitude: number, accuracy: number | null = 8): any => ({
      timestamp: new Date('2026-01-01T12:00:00Z').getTime(),
      coords: { latitude, longitude, accuracy }
    });

    beforeEach(() => {
      spyOn(console, 'error');
      spyOn(console, 'warn');
      checkPermissions = spyOn(GeolocationWeb.prototype, 'checkPermissions')
        .and.resolveTo({ location: 'granted', coarseLocation: 'granted' });
      requestPermissions = spyOn(GeolocationWeb.prototype, 'requestPermissions')
        .and.resolveTo({ location: 'granted', coarseLocation: 'granted' });
      getCurrentPosition = spyOn(GeolocationWeb.prototype, 'getCurrentPosition')
        .and.resolveTo(posicion(-33.45, -70.66));
    });

    describe('obtenerUbicacion', () => {
      it('debería devolver latitud, longitud, precisión y hora del GPS', async () => {
        expect(await service.obtenerUbicacion()).toEqual({
          latitud: -33.45,
          longitud: -70.66,
          precision: 8,
          timestamp: new Date('2026-01-01T12:00:00Z')
        });
        expect(requestPermissions).not.toHaveBeenCalled();
      });

      it('debería pedir permiso solo si aún no está concedido', async () => {
        checkPermissions.and.resolveTo({ location: 'prompt', coarseLocation: 'prompt' });
        await service.obtenerUbicacion();
        expect(requestPermissions).toHaveBeenCalledTimes(1);
      });

      it('debería informar permiso denegado sin consultar el GPS', async () => {
        checkPermissions.and.resolveTo({ location: 'prompt', coarseLocation: 'prompt' });
        requestPermissions.and.resolveTo({ location: 'denied', coarseLocation: 'denied' });

        await expectAsync(service.obtenerUbicacion()).toBeRejectedWithError('permiso-denegado');
        expect(getCurrentPosition).not.toHaveBeenCalled();
      });

      it('debería rechazar coordenadas inválidas en vez de armar un SOS sin ubicación', async () => {
        getCurrentPosition.and.resolveTo(posicion(NaN, -70.66));
        await expectAsync(service.obtenerUbicacion()).toBeRejectedWithError('ubicacion-no-disponible');
      });

      it('debería usar precisión 0 si el GPS no la entrega', async () => {
        getCurrentPosition.and.resolveTo(posicion(-33.45, -70.66, null));
        expect((await service.obtenerUbicacion()).precision).toBe(0);
      });

      const errores: [string, string][] = [
        ['OS-PLUG-GLOC-0003', 'permiso-denegado'],
        ['OS-PLUG-GLOC-0007', 'ubicacion-no-disponible'],
        ['OS-PLUG-GLOC-0009', 'ubicacion-no-disponible'],
        ['OS-PLUG-GLOC-0017', 'ubicacion-no-disponible'],
        ['OS-PLUG-GLOC-0010', 'tiempo-excedido'],
        ['CODIGO-DESCONOCIDO', 'ubicacion-no-disponible']
      ];

      errores.forEach(([codigo, esperado]) => {
        it(`debería traducir el error ${codigo} a "${esperado}"`, async () => {
          getCurrentPosition.and.rejectWith({ code: codigo, message: 'fallo nativo' });
          await expectAsync(service.obtenerUbicacion()).toBeRejectedWithError(esperado);
        });
      });
    });

    describe('watchUbicacion', () => {
      let watchPosition: jasmine.Spy;
      let emitir: (posicion: any, error?: any) => void;
      let recibidas: jasmine.Spy;

      beforeEach(() => {
        recibidas = jasmine.createSpy('recibidas');
        watchPosition = spyOn(GeolocationWeb.prototype, 'watchPosition').and.callFake(async (_opciones: any, callback: any) => {
          emitir = callback;
          return 'watch-1';
        });
      });

      it('debería entregar cada posición válida y devolver el id del watcher', async () => {
        expect(await service.watchUbicacion(recibidas)).toBe('watch-1');

        emitir(posicion(-33.5, -70.7));

        expect(recibidas).toHaveBeenCalledTimes(1);
        expect(recibidas.calls.mostRecent().args[0].latitud).toBe(-33.5);
      });

      it('debería ignorar errores temporales y posiciones inválidas sin cortar el seguimiento', async () => {
        await service.watchUbicacion(recibidas);

        emitir(null, new Error('GPS temporal'));
        emitir(null);
        emitir(posicion(NaN, NaN));
        expect(recibidas).not.toHaveBeenCalled();

        emitir(posicion(-33.5, -70.7));
        expect(recibidas).toHaveBeenCalledTimes(1);
      });

      it('debería devolver null sin iniciar el seguimiento si no hay permiso', async () => {
        checkPermissions.and.resolveTo({ location: 'denied', coarseLocation: 'denied' });
        requestPermissions.and.resolveTo({ location: 'denied', coarseLocation: 'denied' });

        expect(await service.watchUbicacion(recibidas)).toBeNull();
        expect(watchPosition).not.toHaveBeenCalled();
      });

      it('debería devolver null si el plugin falla', async () => {
        watchPosition.and.rejectWith(new Error('fallo'));
        expect(await service.watchUbicacion(recibidas)).toBeNull();
      });
    });

    it('debería detener el watcher indicado y no propagar un error del plugin', async () => {
      const clearWatch = spyOn(GeolocationWeb.prototype, 'clearWatch').and.resolveTo();

      await service.detenerWatchUbicacion('watch-1');
      expect(clearWatch).toHaveBeenCalledWith({ id: 'watch-1' });

      clearWatch.and.rejectWith(new Error('fallo'));
      await expectAsync(service.detenerWatchUbicacion('watch-1')).toBeResolved();
    });
  });
});
