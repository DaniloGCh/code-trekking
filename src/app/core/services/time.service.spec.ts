import { TestBed } from '@angular/core/testing';

import { TimeService } from './time.service';

describe('TimeService (fecha en hora de Chile)', () => {
  let service: TimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimeService);
    jasmine.clock().install();
  });

  afterEach(() => {
    service.stopClock();
    jasmine.clock().uninstall();
  });

  it('debería emitir la fecha apenas inicia el reloj', () => {
    jasmine.clock().mockDate(new Date('2026-03-15T15:00:00Z'));
    service.startClock();

    expect(service.dateTime.value).toContain('15');
    expect(service.dateTime.value.toLowerCase()).toContain('mar');
  });

  it('debería usar la zona horaria America/Santiago y no la del dispositivo', () => {
    // 02:00 UTC del 15 de marzo = 23:00 del 14 de marzo en Chile (UTC-3)
    jasmine.clock().mockDate(new Date('2026-03-15T02:00:00Z'));
    service.startClock();

    expect(service.dateTime.value).toContain('14');
    expect(service.dateTime.value).not.toContain('15');
  });

  it('debería actualizarse cada segundo (cambio de día)', () => {
    jasmine.clock().mockDate(new Date('2026-03-15T02:59:59Z')); // 23:59:59 del 14 en Chile
    service.startClock();
    expect(service.dateTime.value).toContain('14');

    jasmine.clock().tick(1000);
    expect(service.dateTime.value).toContain('15');
  });

  it('debería dejar de actualizarse al detener el reloj', () => {
    jasmine.clock().mockDate(new Date('2026-03-15T02:59:59Z'));
    service.startClock();
    const emisiones: string[] = [];
    const sub = service.dateTime.subscribe(v => emisiones.push(v));

    service.stopClock();
    jasmine.clock().tick(5000);

    expect(emisiones.length).toBe(1); // solo el valor actual al suscribirse
    expect(service.dateTime.value).toContain('14');
    sub.unsubscribe();
  });

  it('debería no fallar si se detiene sin haber iniciado', () => {
    expect(() => service.stopClock()).not.toThrow();
  });
});
