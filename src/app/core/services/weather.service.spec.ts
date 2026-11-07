import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { WeatherService } from './weather.service';

describe('WeatherService (consultas de clima y ubicación)', () => {
  let service: WeatherService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(WeatherService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debería pedir el clima de las coordenadas del usuario, en métrico y español', () => {
    let respuesta: any;
    service.getWeatherByCoords(-33.45, -70.66).subscribe(r => respuesta = r);

    const req = http.expectOne(r => r.url.startsWith('https://api.openweathermap.org/data/2.5/weather'));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toContain('lat=-33.45');
    expect(req.request.url).toContain('lon=-70.66');
    expect(req.request.url).toContain('units=metric');
    expect(req.request.url).toContain('lang=es');
    expect(req.request.url).toContain('appid=');

    req.flush({ main: { temp: 20 } });
    expect(respuesta).toEqual({ main: { temp: 20 } });
  });

  it('debería propagar el error si la API de clima falla', () => {
    let error: any;
    service.getWeatherByCoords(0, 0).subscribe({ error: e => error = e });

    http.expectOne(r => r.url.includes('openweathermap')).flush('fallo', { status: 500, statusText: 'Server Error' });

    expect(error.status).toBe(500);
  });

  it('debería pedir el nombre del lugar a Nominatim con las coordenadas del usuario', () => {
    let respuesta: any;
    service.getLocationName(-33.45, -70.66).subscribe(r => respuesta = r);

    const req = http.expectOne(r => r.url.startsWith('https://nominatim.openstreetmap.org/reverse'));
    expect(req.request.url).toContain('lat=-33.45');
    expect(req.request.url).toContain('lon=-70.66');
    expect(req.request.url).toContain('format=json');
    expect(req.request.url).toContain('accept-language=es');

    req.flush({ address: { city: 'Santiago' } });
    expect(respuesta.address.city).toBe('Santiago');
  });
});
