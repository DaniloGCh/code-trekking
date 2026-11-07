import { TestBed } from '@angular/core/testing';

import { TipoCambioService } from './tipo-cambio.service';

describe('TipoCambioService (conversión CLP → USD del checkout)', () => {
  let service: TipoCambioService;
  let fetchSpy: jasmine.Spy;

  const respuesta = (body: any, ok = true, status = 200) =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoCambioService);
    fetchSpy = spyOn(window, 'fetch');
    spyOn(console, 'warn');

    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => jasmine.clock().uninstall());

  it('debería devolver la tasa CLP de la API pública', async () => {
    fetchSpy.and.returnValue(respuesta({ rates: { CLP: 935.5 } }));

    expect(await service.obtenerTasaClpPorUsd()).toBe(935.5);
    expect(fetchSpy).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD', jasmine.any(Object));
  });

  it('debería usar la tasa de respaldo 950 si la API responde con error HTTP', async () => {
    fetchSpy.and.returnValue(respuesta({}, false, 503));
    expect(await service.obtenerTasaClpPorUsd()).toBe(950);
    expect(service.TASA_RESPALDO).toBe(950);
  });

  it('debería usar la tasa de respaldo si no hay red', async () => {
    fetchSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
    expect(await service.obtenerTasaClpPorUsd()).toBe(950);
  });

  it('debería usar la tasa de respaldo si la respuesta no trae una tasa válida', async () => {
    for (const body of [{}, { rates: {} }, { rates: { CLP: 'mil' } }, { rates: { CLP: 0 } }, { rates: { CLP: -5 } }]) {
      fetchSpy.and.returnValue(respuesta(body));
      expect(await service.obtenerTasaClpPorUsd()).withContext(JSON.stringify(body)).toBe(950);
    }
  });

  it('debería usar la tasa de respaldo si la API no responde en 5 segundos', async () => {
    fetchSpy.and.callFake((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    const promesa = service.obtenerTasaClpPorUsd();
    jasmine.clock().tick(5000);

    expect(await promesa).toBe(950);
  });

  it('debería reutilizar la tasa en caché durante 10 minutos', async () => {
    fetchSpy.and.returnValue(respuesta({ rates: { CLP: 940 } }));
    await service.obtenerTasaClpPorUsd();

    jasmine.clock().tick(10 * 60 * 1000 - 1);
    expect(await service.obtenerTasaClpPorUsd()).toBe(940);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.and.returnValue(respuesta({ rates: { CLP: 960 } }));
    jasmine.clock().tick(1);
    expect(await service.obtenerTasaClpPorUsd()).toBe(960);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('debería no guardar en caché la tasa de respaldo (reintenta la API)', async () => {
    fetchSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
    expect(await service.obtenerTasaClpPorUsd()).toBe(950);

    fetchSpy.and.returnValue(respuesta({ rates: { CLP: 930 } }));
    expect(await service.obtenerTasaClpPorUsd()).toBe(930);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('debería hacer una sola petición aunque se pida la tasa varias veces a la vez', async () => {
    fetchSpy.and.returnValue(respuesta({ rates: { CLP: 945 } }));

    const tasas = await Promise.all([
      service.obtenerTasaClpPorUsd(),
      service.obtenerTasaClpPorUsd(),
      service.obtenerTasaClpPorUsd()
    ]);

    expect(tasas).toEqual([945, 945, 945]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
