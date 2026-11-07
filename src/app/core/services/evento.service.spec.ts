import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

import { EventoService } from './evento.service';

describe('EventoService (código de invitación)', () => {
  let service: EventoService;

  /** generarCodigo es privado: se accede solo para la prueba. */
  const generarCodigo = (): string => (service as any).generarCodigo();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: {} }
      ]
    });
    service = TestBed.inject(EventoService);
  });

  it('debería generar códigos con formato TRK-XXXXXX (mayúsculas y dígitos)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigo()).toMatch(/^TRK-[A-Z0-9]{6}$/);
    }
  });

  it('debería usar todo el alfabeto según el valor aleatorio', () => {
    const random = spyOn(Math, 'random');

    random.and.returnValue(0);
    expect(generarCodigo()).toBe('TRK-AAAAAA');

    random.and.returnValue(0.9999);
    expect(generarCodigo()).toBe('TRK-999999');

    random.and.returnValues(0, 1 / 36, 25 / 36, 26 / 36, 35 / 36, 0.5);
    expect(generarCodigo()).toBe('TRK-ABZ09S');
  });

  it('debería generar códigos distintos en llamadas sucesivas', () => {
    const codigos = new Set(Array.from({ length: 50 }, () => generarCodigo()));
    expect(codigos.size).toBeGreaterThan(45);
  });
});
