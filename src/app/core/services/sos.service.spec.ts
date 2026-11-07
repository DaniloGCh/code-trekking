import { TestBed } from '@angular/core/testing';

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
  });

  it('debería no hacer nada al detener un watcher inexistente', async () => {
    await expectAsync(service.detenerWatchUbicacion(null)).toBeResolved();
  });
});
