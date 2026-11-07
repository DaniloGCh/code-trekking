import { TestBed } from '@angular/core/testing';

import { ConexionService } from './conexion.service';

describe('ConexionService (RNF disponibilidad: estado de conexión)', () => {
  let onLine: jasmine.Spy;

  const crear = () => {
    TestBed.configureTestingModule({});
    return TestBed.inject(ConexionService);
  };

  beforeEach(() => {
    onLine = spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
  });

  it('debería partir con el estado actual del navegador (con internet)', () => {
    expect(crear().estaOnline).toBeTrue();
  });

  it('debería partir sin conexión si el dispositivo está offline', () => {
    onLine.and.returnValue(false);
    expect(crear().estaOnline).toBeFalse();
  });

  it('debería actualizarse con los eventos offline y online', () => {
    const service = crear();

    window.dispatchEvent(new Event('offline'));
    expect(service.estaOnline).toBeFalse();

    window.dispatchEvent(new Event('online'));
    expect(service.estaOnline).toBeTrue();
  });

  it('debería emitir en online$ solo cuando el estado cambia', () => {
    const service = crear();
    const valores: boolean[] = [];
    const sub = service.online$.subscribe(v => valores.push(v));

    window.dispatchEvent(new Event('online'));  // sin cambio
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('offline')); // sin cambio
    window.dispatchEvent(new Event('online'));

    expect(valores).toEqual([true, false, true]);
    sub.unsubscribe();
  });
});
