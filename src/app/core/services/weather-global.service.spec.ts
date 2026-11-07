import { TestBed } from '@angular/core/testing';

import { WeatherGlobalService } from './weather-global.service';
import { WeatherService } from './weather.service';
import { SosService, UbicacionSOS } from './sos.service';

describe('WeatherGlobalService (clima según la ubicación del usuario)', () => {
  let service: WeatherGlobalService;
  let sos: jasmine.SpyObj<SosService>;
  let fetchSpy: jasmine.Spy;
  let climaApi: () => Promise<any>;
  let lugarApi: () => Promise<any>;

  const aqui: UbicacionSOS = { latitud: -33.45, longitud: -70.66, precision: 5, timestamp: new Date(0) };

  const ok = (body: any) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  const noOk = (status: number) => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) });

  const clima = (extra: any = {}) => ({
    name: 'Nombre OpenWeather',
    main: { temp: 18.6, humidity: 40 },
    wind: { speed: 5 }, // m/s
    weather: [{ main: 'Clear', description: 'Cielo claro' }],
    ...extra
  });

  const urlsPedidas = () => fetchSpy.calls.allArgs().map(a => a[0] as string);

  beforeEach(() => {
    sos = jasmine.createSpyObj<SosService>('SosService', ['obtenerUbicacion', 'watchUbicacion', 'detenerWatchUbicacion']);
    sos.obtenerUbicacion.and.resolveTo(aqui);
    sos.watchUbicacion.and.resolveTo('watch-1');
    sos.detenerWatchUbicacion.and.resolveTo();

    climaApi = () => ok(clima());
    lugarApi = () => ok({ address: { suburb: 'Ñuñoa', city: 'Santiago' } });
    fetchSpy = spyOn(window, 'fetch').and.callFake(((url: string) =>
      url.includes('openweathermap') ? climaApi() : lugarApi()) as any);

    spyOn(console, 'error');
    spyOn(console, 'warn');

    TestBed.configureTestingModule({
      providers: [
        { provide: WeatherService, useValue: {} },
        { provide: SosService, useValue: sos }
      ]
    });
    service = TestBed.inject(WeatherGlobalService);
  });

  // =========================
  // 🌡️ TRANSFORMACIÓN
  // =========================
  describe('transformación de la respuesta', () => {
    it('debería redondear la temperatura y entregar humedad y descripción', async () => {
      await service.loadWeather(aqui);

      expect(service.temperature.value).toBe(19);
      expect(service.humidity.value).toBe(40);
      expect(service.description.value).toBe('Cielo claro');
    });

    it('debería convertir el viento de m/s a km/h', async () => {
      await service.loadWeather(aqui);
      expect(service.windSpeed.value).toBe(18);
    });

    const iconos: [string, string, string][] = [
      ['Rain', 'lluvia ligera', 'rainy'],
      ['Drizzle', 'drizzle', 'rainy'],
      ['Thunderstorm', 'tormenta eléctrica', 'thunderstorm'],
      ['Thunderstorm', 'descarga', 'thunderstorm'],
      ['Clouds', 'muy nuboso', 'cloudy'],
      ['Clouds', 'overcast', 'cloudy'],
      ['Clear', 'cielo claro', 'sunny'],
      ['Mist', 'neblina', 'partly-sunny']
    ];

    iconos.forEach(([main, description, icono]) => {
      it(`debería mostrar el icono "${icono}" para ${main} / "${description}"`, async () => {
        climaApi = () => ok(clima({ weather: [{ main, description }] }));
        await service.loadWeather(aqui);
        expect(service.icon.value).toBe(icono);
      });
    });
  });

  // =========================
  // 📍 UBICACIÓN
  // =========================
  describe('uso de la ubicación del usuario', () => {
    it('debería consultar el clima y el lugar con las coordenadas entregadas', async () => {
      await service.loadWeather(aqui);

      const [urlClima, urlLugar] = urlsPedidas();
      expect(urlClima).toContain('lat=-33.45&lon=-70.66');
      expect(urlClima).toContain('units=metric');
      expect(urlLugar).toContain('lat=-33.45&lon=-70.66');
      expect(sos.obtenerUbicacion).not.toHaveBeenCalled();
    });

    it('debería pedir la ubicación al GPS si no se le entrega una', async () => {
      await service.loadWeather();
      expect(sos.obtenerUbicacion).toHaveBeenCalledTimes(1);
      expect(urlsPedidas()[0]).toContain('lat=-33.45&lon=-70.66');
    });

    const erroresGps: [string, string][] = [
      ['permiso-denegado', 'Permiso de ubicación denegado'],
      ['tiempo-excedido', 'GPS lento, intenta de nuevo'],
      ['ubicacion-no-disponible', 'GPS no disponible']
    ];

    erroresGps.forEach(([error, mensaje]) => {
      it(`debería mostrar "${mensaje}" sin consultar la API si el GPS falla con ${error}`, async () => {
        sos.obtenerUbicacion.and.rejectWith(new Error(error));

        await service.loadWeather();

        expect(service.locationName.value).toBe(mensaje);
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    });

    it('debería preferir el barrio y luego ciudad, pueblo, villa, comuna y región', async () => {
      const casos: [any, string][] = [
        [{ suburb: 'Ñuñoa', city: 'Santiago' }, 'Ñuñoa'],
        [{ city: 'Santiago', state: 'RM' }, 'Santiago'],
        [{ town: 'Pirque', state: 'RM' }, 'Pirque'],
        [{ village: 'Farellones' }, 'Farellones'],
        [{ county: 'Cordillera' }, 'Cordillera'],
        [{ state: 'Región Metropolitana' }, 'Región Metropolitana'],
        [{}, 'Ubicación actual']
      ];

      for (const [address, esperado] of casos) {
        (service as any).lastLocationName = null;
        lugarApi = () => ok({ address });
        await service.loadWeather(aqui);
        expect(service.locationName.value).withContext(JSON.stringify(address)).toBe(esperado);
      }
    });

    it('debería reutilizar el nombre del lugar sin volver a consultar Nominatim', async () => {
      await service.loadWeather(aqui);
      await service.loadWeather(aqui);

      expect(urlsPedidas().filter(u => u.includes('nominatim')).length).toBe(1);
      expect(service.locationName.value).toBe('Ñuñoa');
    });
  });

  // =========================
  // 🛟 RESPALDO
  // =========================
  describe('respaldo cuando falla una API', () => {
    it('debería avisar y conservar el último clima si OpenWeather responde con error', async () => {
      await service.loadWeather(aqui);

      climaApi = () => noOk(500);
      await service.loadWeather(aqui);

      expect(service.locationName.value).toBe('No se pudo obtener el clima (API o conexión)');
      expect(service.temperature.value).toBe(19);
    });

    it('debería avisar si no hay conexión con OpenWeather', async () => {
      climaApi = () => Promise.reject(new TypeError('Failed to fetch'));
      await service.loadWeather(aqui);

      expect(service.locationName.value).toBe('No se pudo obtener el clima (API o conexión)');
      expect(service.temperature.value).toBeNull();
    });

    it('debería poder reintentar después de un fallo', async () => {
      climaApi = () => noOk(500);
      await service.loadWeather(aqui);

      climaApi = () => ok(clima());
      await service.loadWeather(aqui);

      expect(service.temperature.value).toBe(19);
      expect(service.locationName.value).toBe('Ñuñoa');
    });

    it('debería usar el nombre de OpenWeather si Nominatim responde con error', async () => {
      lugarApi = () => noOk(503);
      await service.loadWeather(aqui);
      expect(service.locationName.value).toBe('Nombre OpenWeather');
    });

    it('debería usar el nombre de OpenWeather si Nominatim no responde', async () => {
      lugarApi = () => Promise.reject(new TypeError('Failed to fetch'));
      await service.loadWeather(aqui);
      expect(service.locationName.value).toBe('Nombre OpenWeather');
    });

    it('debería mostrar "Ubicación actual" si ninguna API entrega un nombre', async () => {
      climaApi = () => ok(clima({ name: '' }));
      lugarApi = () => noOk(503);
      await service.loadWeather(aqui);
      expect(service.locationName.value).toBe('Ubicación actual');
    });

    it('debería ignorar una segunda carga mientras la primera sigue en curso', async () => {
      await Promise.all([service.loadWeather(aqui), service.loadWeather(aqui)]);
      expect(urlsPedidas().filter(u => u.includes('openweathermap')).length).toBe(1);
    });
  });

  // =========================
  // 📡 SEGUIMIENTO
  // =========================
  describe('seguimiento de la ubicación', () => {
    const moverA = async (latitud: number, longitud: number) => {
      const callback = sos.watchUbicacion.calls.mostRecent().args[0];
      await (callback as any)({ latitud, longitud, precision: 5, timestamp: new Date(0) });
    };

    const consultasDeClima = () => urlsPedidas().filter(u => u.includes('openweathermap'));

    it('debería cargar el clima inicial y dejar activo el seguimiento', async () => {
      await service.startLocationTracking();

      expect(service.temperature.value).toBe(19);
      expect(sos.watchUbicacion).toHaveBeenCalledTimes(1);
    });

    it('debería no iniciar dos seguimientos', async () => {
      await service.startLocationTracking();
      await service.startLocationTracking();
      expect(sos.watchUbicacion).toHaveBeenCalledTimes(1);
    });

    it('debería no iniciar el seguimiento si falla la ubicación inicial', async () => {
      sos.obtenerUbicacion.and.rejectWith(new Error('permiso-denegado'));

      await service.startLocationTracking();

      expect(service.locationName.value).toBe('Permiso de ubicación denegado');
      expect(sos.watchUbicacion).not.toHaveBeenCalled();
    });

    it('debería no recargar el clima con movimientos de 200 m o menos', async () => {
      await service.startLocationTracking();
      await moverA(-33.451, -70.66); // ~111 m
      expect(consultasDeClima().length).toBe(1);
    });

    it('debería recargar clima y lugar al moverse más de 200 m', async () => {
      await service.startLocationTracking();
      lugarApi = () => ok({ address: { suburb: 'Providencia' } });

      await moverA(-33.46, -70.66); // ~1,1 km

      expect(consultasDeClima().length).toBe(2);
      expect(urlsPedidas().pop()).toContain('lat=-33.46');
      expect(service.locationName.value).toBe('Providencia');
    });

    it('debería medir el siguiente movimiento desde la última posición actualizada', async () => {
      await service.startLocationTracking();
      await moverA(-33.46, -70.66);
      await moverA(-33.461, -70.66); // ~111 m desde la última actualización
      expect(consultasDeClima().length).toBe(2);
    });

    it('debería detener el watcher activo una sola vez', async () => {
      await service.startLocationTracking();

      await service.stopLocationTracking();
      await service.stopLocationTracking();

      expect(sos.detenerWatchUbicacion).toHaveBeenCalledTimes(1);
      expect(sos.detenerWatchUbicacion).toHaveBeenCalledWith('watch-1');
    });

    it('debería no hacer nada al detener si no había seguimiento', async () => {
      await service.stopLocationTracking();
      expect(sos.detenerWatchUbicacion).not.toHaveBeenCalled();
    });
  });
});
