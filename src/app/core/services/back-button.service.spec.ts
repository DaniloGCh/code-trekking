import { TestBed } from '@angular/core/testing';

import { BackButtonService } from './back-button.service';

describe('BackButtonService (botón atrás de Android)', () => {
  let service: BackButtonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackButtonService);
  });

  it('debería devolver false si no hay handlers (se navega atrás normalmente)', () => {
    expect(service.manejar()).toBeFalse();
  });

  it('debería devolver true si un handler maneja el atrás (ej. cierra el visor de fotos)', () => {
    const cerrarVisor = jasmine.createSpy('cerrarVisor').and.returnValue(true);
    service.registrar(cerrarVisor);

    expect(service.manejar()).toBeTrue();
    expect(cerrarVisor).toHaveBeenCalledTimes(1);
  });

  it('debería dar prioridad al último handler registrado', () => {
    const primero = jasmine.createSpy('primero').and.returnValue(true);
    const ultimo = jasmine.createSpy('ultimo').and.returnValue(true);
    service.registrar(primero);
    service.registrar(ultimo);

    service.manejar();

    expect(ultimo).toHaveBeenCalled();
    expect(primero).not.toHaveBeenCalled();
  });

  it('debería pasar al handler anterior si el último no maneja el atrás', () => {
    const primero = jasmine.createSpy('primero').and.returnValue(true);
    const ultimo = jasmine.createSpy('ultimo').and.returnValue(false);
    service.registrar(primero);
    service.registrar(ultimo);

    expect(service.manejar()).toBeTrue();
    expect(ultimo).toHaveBeenCalled();
    expect(primero).toHaveBeenCalled();
  });

  it('debería devolver false si ningún handler maneja el atrás', () => {
    service.registrar(() => false);
    service.registrar(() => false);
    expect(service.manejar()).toBeFalse();
  });

  it('debería dejar de llamar a un handler después de des-registrarlo', () => {
    const handler = jasmine.createSpy('handler').and.returnValue(true);
    const desregistrar = service.registrar(handler);

    desregistrar();

    expect(service.manejar()).toBeFalse();
    expect(handler).not.toHaveBeenCalled();
  });
});
