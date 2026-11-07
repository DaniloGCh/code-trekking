import { TestBed } from '@angular/core/testing';

import { SecurityService } from './security.service';

describe('SecurityService (RNF seguridad)', () => {
  let service: SecurityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SecurityService);
  });

  // =========================
  // 🛡️ SANITIZAR INPUT (XSS)
  // =========================
  describe('sanitizeInput (XSS)', () => {
    it('debería escapar etiquetas <script> para que no se ejecuten', () => {
      const resultado = service.sanitizeInput('<script>alert("xss")</script>');
      expect(resultado).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(resultado).not.toContain('<');
      expect(resultado).not.toContain('>');
    });

    it('debería escapar comillas simples, dobles, & y /', () => {
      expect(service.sanitizeInput(`a&b 'c' "d" e/f`))
        .toBe('a&amp;b &#x27;c&#x27; &quot;d&quot; e&#x2F;f');
    });

    it('debería neutralizar atributos de evento dentro de una etiqueta', () => {
      const resultado = service.sanitizeInput('<img src=x onerror="alert(1)">');
      expect(resultado.startsWith('&lt;img')).toBeTrue();
      expect(resultado).not.toMatch(/<img/i);
    });

    it('debería recortar espacios al inicio y al final', () => {
      expect(service.sanitizeInput('   hola   ')).toBe('hola');
    });

    it('debería devolver cadena vacía si la entrada es vacía o nula', () => {
      expect(service.sanitizeInput('')).toBe('');
      expect(service.sanitizeInput(null as any)).toBe('');
      expect(service.sanitizeInput(undefined as any)).toBe('');
    });

    it('debería dejar intacto un texto sin caracteres peligrosos', () => {
      expect(service.sanitizeInput('Cerro La Campana')).toBe('Cerro La Campana');
    });
  });

  describe('decodeEntities', () => {
    it('debería revertir lo que genera sanitizeInput', () => {
      const original = `O'Higgins <b> & "Valpo"/Chile`;
      expect(service.decodeEntities(service.sanitizeInput(original))).toBe(original);
    });

    it('debería revertir un texto sanitizado dos veces', () => {
      const doble = service.sanitizeInput(service.sanitizeInput(`O'Higgins`));
      expect(service.decodeEntities(doble)).toBe(`O'Higgins`);
    });

    it('debería devolver cadena vacía si la entrada es vacía', () => {
      expect(service.decodeEntities('')).toBe('');
    });
  });

  // =========================
  // 🛡️ VALIDAR NOMBRE
  // =========================
  describe('isValidNombre', () => {
    it('debería aceptar nombres con tildes, ñ, espacios, guiones y apóstrofo', () => {
      expect(service.isValidNombre('José Muñoz')).toBeTrue();
      expect(service.isValidNombre('María-Inés')).toBeTrue();
      expect(service.isValidNombre(`O'Higgins`)).toBeTrue();
      expect(service.isValidNombre('Güemes')).toBeTrue();
    });

    it('debería rechazar nombres con números o símbolos', () => {
      expect(service.isValidNombre('Juan123')).toBeFalse();
      expect(service.isValidNombre('ana@mail')).toBeFalse();
      expect(service.isValidNombre('<script>')).toBeFalse();
    });

    it('debería rechazar nombres más cortos que el mínimo (3)', () => {
      expect(service.isValidNombre('Al')).toBeFalse();
      expect(service.isValidNombre('   Al   ')).toBeFalse();
      expect(service.isValidNombre('Ana')).toBeTrue();
    });

    it('debería rechazar nombres más largos que el máximo (50)', () => {
      expect(service.isValidNombre('a'.repeat(50))).toBeTrue();
      expect(service.isValidNombre('a'.repeat(51))).toBeFalse();
    });

    it('debería respetar límites personalizados', () => {
      expect(service.isValidNombre('Ana', 4, 10)).toBeFalse();
      expect(service.isValidNombre('Anita', 4, 10)).toBeTrue();
    });

    it('debería rechazar nombre vacío o nulo', () => {
      expect(service.isValidNombre('')).toBeFalse();
      expect(service.isValidNombre(null as any)).toBeFalse();
    });
  });

  describe('normalizeNombre', () => {
    it('debería unificar el apóstrofo tipográfico y espacios repetidos', () => {
      expect(service.normalizeNombre('  O’Higgins   del   Sur ')).toBe(`O'Higgins del Sur`);
    });

    it('debería componer tildes descompuestas (NFD → NFC)', () => {
      const descompuesto = 'José';
      const normalizado = service.normalizeNombre(descompuesto);
      expect(normalizado).toBe('José');
      expect(service.isValidNombre(normalizado)).toBeTrue();
    });

    it('debería devolver cadena vacía si la entrada es vacía', () => {
      expect(service.normalizeNombre('')).toBe('');
    });
  });

  // =========================
  // 🛡️ VALIDACIONES DE DATOS
  // =========================
  describe('isValidEmail', () => {
    it('debería aceptar correos con formato válido', () => {
      expect(service.isValidEmail('usuario@dominio.cl')).toBeTrue();
      expect(service.isValidEmail('nombre.apellido+tag@sub.dominio.com')).toBeTrue();
    });

    it('debería rechazar correos con formato inválido', () => {
      expect(service.isValidEmail('sin-arroba.cl')).toBeFalse();
      expect(service.isValidEmail('a@b')).toBeFalse();
      expect(service.isValidEmail('a b@c.cl')).toBeFalse();
      expect(service.isValidEmail('')).toBeFalse();
    });

    it('debería rechazar correos de más de 100 caracteres', () => {
      const largo = 'a'.repeat(95) + '@x.cl'; // 100 caracteres
      expect(service.isValidEmail(largo)).toBeTrue();
      expect(service.isValidEmail('a' + largo)).toBeFalse();
    });
  });

  describe('isStrongPassword', () => {
    it('debería aceptar una contraseña que cumple todas las reglas', () => {
      expect(service.isStrongPassword('Trekking1!')).toEqual({ valid: true, message: '' });
    });

    it('debería indicar la primera regla que no se cumple', () => {
      expect(service.isStrongPassword('Ab1!').message).toBe('Mínimo 8 caracteres');
      expect(service.isStrongPassword('trekking1!').message).toBe('Debe tener al menos una mayúscula');
      expect(service.isStrongPassword('TREKKING1!').message).toBe('Debe tener al menos una minúscula');
      expect(service.isStrongPassword('Trekking!!').message).toBe('Debe tener al menos un número');
      expect(service.isStrongPassword('Trekking12').message).toBe('Debe tener al menos un carácter especial');
    });
  });

  describe('isSafeText', () => {
    it('debería aceptar texto normal', () => {
      expect(service.isSafeText('Nos juntamos a las 8:00 en el estacionamiento.')).toBeTrue();
    });

    it('debería rechazar patrones peligrosos', () => {
      expect(service.isSafeText('<script>alert(1)</script>')).toBeFalse();
      expect(service.isSafeText('javascript:alert(1)')).toBeFalse();
      expect(service.isSafeText('<div onclick = "x()">')).toBeFalse();
      expect(service.isSafeText('eval(algo)')).toBeFalse();
      expect(service.isSafeText('document.cookie')).toBeFalse();
      expect(service.isSafeText('<iframe src="x">')).toBeFalse();
      expect(service.isSafeText('data:text/html,<b>')).toBeFalse();
    });

    it('debería rechazar texto vacío o que excede el largo máximo', () => {
      expect(service.isSafeText('')).toBeFalse();
      expect(service.isSafeText('a'.repeat(501))).toBeFalse();
      expect(service.isSafeText('a'.repeat(20), 10)).toBeFalse();
    });
  });

  describe('isValidPhone', () => {
    it('debería aceptar celulares chilenos con y sin +56', () => {
      expect(service.isValidPhone('+56912345678')).toBeTrue();
      expect(service.isValidPhone('912345678')).toBeTrue();
    });

    it('debería aceptar separadores (espacios y guiones)', () => {
      expect(service.isValidPhone('+56 9 1234 5678')).toBeTrue();
      expect(service.isValidPhone('9-1234-5678')).toBeTrue();
    });

    it('debería rechazar números que no son celulares chilenos válidos', () => {
      expect(service.isValidPhone('+56212345678')).toBeFalse(); // fijo
      expect(service.isValidPhone('91234567')).toBeFalse();     // falta un dígito
      expect(service.isValidPhone('+5691234567890')).toBeFalse();
      expect(service.isValidPhone('9abc45678')).toBeFalse();
    });
  });

  describe('isValidCoordinates', () => {
    it('debería aceptar coordenadas dentro de rango', () => {
      expect(service.isValidCoordinates(-33.45, -70.66)).toBeTrue();
      expect(service.isValidCoordinates(90, 180)).toBeTrue();
      expect(service.isValidCoordinates(-90, -180)).toBeTrue();
    });

    it('debería rechazar coordenadas fuera de rango, NaN o infinitas', () => {
      expect(service.isValidCoordinates(91, 0)).toBeFalse();
      expect(service.isValidCoordinates(0, -181)).toBeFalse();
      expect(service.isValidCoordinates(NaN, 0)).toBeFalse();
      expect(service.isValidCoordinates(0, Infinity)).toBeFalse();
      expect(service.isValidCoordinates('10' as any, 0)).toBeFalse();
    });
  });

  describe('isValidFirestoreId', () => {
    it('debería aceptar ids alfanuméricos con _ y -', () => {
      expect(service.isValidFirestoreId('aB3_x-9')).toBeTrue();
    });

    it('debería rechazar ids vacíos, con / o demasiado largos', () => {
      expect(service.isValidFirestoreId('')).toBeFalse();
      expect(service.isValidFirestoreId('   ')).toBeFalse();
      expect(service.isValidFirestoreId('usuarios/abc')).toBeFalse();
      expect(service.isValidFirestoreId('a'.repeat(129))).toBeFalse();
    });
  });

  describe('isSafeUrl', () => {
    it('debería aceptar solo https de wikiloc', () => {
      expect(service.isSafeUrl('https://es.wikiloc.com/rutas/123')).toBeTrue();
      expect(service.isSafeUrl('https://wikiloc.com/x')).toBeTrue();
    });

    it('debería rechazar otros protocolos, dominios o URLs inválidas', () => {
      expect(service.isSafeUrl('http://wikiloc.com/x')).toBeFalse();
      expect(service.isSafeUrl('javascript:alert(1)')).toBeFalse();
      expect(service.isSafeUrl('https://malicioso.com')).toBeFalse();
      expect(service.isSafeUrl('no es url')).toBeFalse();
      expect(service.isSafeUrl('')).toBeFalse();
    });
  });

  describe('clearSensitiveData', () => {
    it('debería quitar campos sensibles sin modificar el objeto original', () => {
      const original = { nombre: 'Ana', password: 'x', respuestaSeguridad: 'y', token: 't' };
      const limpio = service.clearSensitiveData(original);
      expect(limpio).toEqual({ nombre: 'Ana' });
      expect(original.password).toBe('x');
    });
  });

  describe('generateCSRFToken', () => {
    it('debería generar 64 caracteres hexadecimales distintos en cada llamada', () => {
      const a = service.generateCSRFToken();
      const b = service.generateCSRFToken();
      expect(a).toMatch(/^[0-9a-f]{64}$/);
      expect(a).not.toBe(b);
    });
  });

  // =========================
  // 🛡️ RATE LIMIT EN MEMORIA
  // =========================
  describe('checkRateLimit', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => jasmine.clock().uninstall());

    it('debería permitir hasta el límite y bloquear el siguiente intento', () => {
      for (let i = 0; i < 3; i++) {
        expect(service.checkRateLimit('login', 3, 60000)).withContext(`intento ${i + 1}`).toBeTrue();
      }
      expect(service.checkRateLimit('login', 3, 60000)).toBeFalse();
      expect(service.checkRateLimit('login', 3, 60000)).toBeFalse();
    });

    it('debería liberar el bloqueo una vez pasada la ventana', () => {
      for (let i = 0; i < 3; i++) service.checkRateLimit('login', 3, 60000);
      expect(service.checkRateLimit('login', 3, 60000)).toBeFalse();

      jasmine.clock().tick(60000);
      expect(service.checkRateLimit('login', 3, 60000)).toBeFalse(); // justo en el límite sigue bloqueado

      jasmine.clock().tick(1);
      expect(service.checkRateLimit('login', 3, 60000)).toBeTrue();
    });

    it('debería contar cada acción por separado', () => {
      for (let i = 0; i < 3; i++) service.checkRateLimit('login', 3);
      expect(service.checkRateLimit('login', 3)).toBeFalse();
      expect(service.checkRateLimit('registro', 3)).toBeTrue();
    });

    it('debería usar 5 intentos por defecto', () => {
      for (let i = 0; i < 5; i++) expect(service.checkRateLimit('accion')).toBeTrue();
      expect(service.checkRateLimit('accion')).toBeFalse();
    });

    it('debería desbloquear al llamar resetRateLimit', () => {
      for (let i = 0; i < 3; i++) service.checkRateLimit('login', 3);
      expect(service.checkRateLimit('login', 3)).toBeFalse();
      service.resetRateLimit('login');
      expect(service.checkRateLimit('login', 3)).toBeTrue();
    });
  });

  // =========================
  // 🛡️ RATE LIMIT PERSISTENTE (localStorage)
  // =========================
  describe('checkPersistentRateLimit (crear-evento)', () => {
    const UNA_HORA = 3600000;
    const uid = 'uid-prueba';
    const clave = `rate-limit:crear-evento:${uid}`;
    let almacen: Record<string, string>;

    beforeEach(() => {
      almacen = {};
      spyOn(localStorage, 'getItem').and.callFake((k: string) => (k in almacen ? almacen[k] : null));
      spyOn(localStorage, 'setItem').and.callFake((k: string, v: string) => { almacen[k] = String(v); });

      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => jasmine.clock().uninstall());

    const registrar = (n: number, separacionMs = 0) => {
      for (let i = 0; i < n; i++) {
        service.registrarAccionPersistente('crear-evento', uid, UNA_HORA);
        if (separacionMs) jasmine.clock().tick(separacionMs);
      }
    };

    it('debería permitir mientras haya menos de 5 eventos en la última hora', () => {
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA))
        .toEqual({ permitido: true, minutosRestantes: 0 });

      registrar(4);
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeTrue();
    });

    it('debería bloquear al llegar a 5 e indicar los minutos restantes', () => {
      registrar(5, 60000); // un evento por minuto (12:00 a 12:04), reloj queda en 12:05

      const resultado = service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA);
      expect(resultado.permitido).toBeFalse();
      // La marca más antigua (12:00) vence a las 13:00 → faltan 55 min
      expect(resultado.minutosRestantes).toBe(55);
    });

    it('debería guardar las marcas en localStorage con una clave por acción y usuario', () => {
      registrar(2);
      expect(localStorage.setItem).toHaveBeenCalledWith(clave, jasmine.any(String));
      expect(JSON.parse(almacen[clave]).length).toBe(2);
    });

    it('debería liberar un cupo cuando vence la marca más antigua', () => {
      registrar(5, 60000);
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeFalse();

      jasmine.clock().tick(55 * 60000 + 1); // 13:00 + 1 ms
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeTrue();
    });

    it('debería indicar al menos 1 minuto restante aunque falten segundos', () => {
      registrar(5);
      jasmine.clock().tick(UNA_HORA - 1000);
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA))
        .toEqual({ permitido: false, minutosRestantes: 1 });
    });

    it('debería contar por separado a cada usuario', () => {
      registrar(5);
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeFalse();
      expect(service.checkPersistentRateLimit('crear-evento', 'otro-uid', 5, UNA_HORA).permitido).toBeTrue();
    });

    it('debería mantener el bloqueo con otra instancia (simula reinicio de la app)', () => {
      registrar(5);
      const nuevaInstancia = new SecurityService();
      expect(nuevaInstancia.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeFalse();
    });

    it('debería ignorar datos corruptos guardados y permitir la acción', () => {
      almacen[clave] = '{no es json';
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeTrue();

      almacen[clave] = JSON.stringify({ no: 'es arreglo' });
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeTrue();

      almacen[clave] = JSON.stringify(['x', null, Date.now()]);
      registrar(3);
      // Solo cuenta 1 marca válida + 3 nuevas = 4 < 5
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeTrue();
    });

    it('debería permitir la acción si localStorage no está disponible al leer', () => {
      (localStorage.getItem as jasmine.Spy).and.throwError('SecurityError');
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA))
        .toEqual({ permitido: true, minutosRestantes: 0 });
    });

    it('debería no lanzar error si localStorage falla al guardar (cuota llena)', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');
      expect(() => registrar(1)).not.toThrow();
      expect(service.checkPersistentRateLimit('crear-evento', uid, 5, UNA_HORA).permitido).toBeTrue();
    });
  });
});
