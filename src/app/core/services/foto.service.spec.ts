import { TestBed } from '@angular/core/testing';

import { FotoService } from './foto.service';

describe('FotoService (validación y compresión de fotos)', () => {
  let service: FotoService;

  /** Largo máximo en base64 que aún pesa 2 MB según el cálculo del servicio. */
  const LARGO_MAX_2MB = Math.floor((2 * 1024 * 1024 * 4) / 3);

  const imagenDeLargo = (largo: number, tipo = 'image/png') => {
    const prefijo = `data:${tipo};base64,`;
    return prefijo + 'A'.repeat(largo - prefijo.length);
  };

  /** Imagen real generada en un canvas; el ruido (con semilla fija) evita que el PNG se comprima. */
  const crearImagen = (ancho: number, alto: number, opciones: { ruido?: boolean; transparente?: boolean } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d')!;

    if (opciones.ruido) {
      const datos = ctx.createImageData(ancho, alto);
      let semilla = 12345;
      for (let i = 0; i < datos.data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          semilla ^= semilla << 13;
          semilla ^= semilla >>> 17;
          semilla ^= semilla << 5;
          datos.data[i + c] = semilla & 0xff;
        }
        datos.data[i + 3] = 255;
      }
      ctx.putImageData(datos, 0, 0);
    } else if (!opciones.transparente) {
      ctx.fillStyle = '#336699';
      ctx.fillRect(0, 0, ancho, alto);
    }

    return canvas.toDataURL('image/png');
  };

  const cargarImagen = (base64: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FotoService);
  });

  // =========================
  // ✅ FORMATO
  // =========================
  describe('validarFormato', () => {
    it('debería aceptar JPG, PNG y WebP', () => {
      ['image/jpeg', 'image/png', 'image/webp'].forEach(tipo =>
        expect(service.validarFormato(`data:${tipo};base64,AAAA`)).withContext(tipo).toEqual({ valid: true, message: '' }));
    });

    it('debería rechazar otros tipos de imagen', () => {
      ['image/gif', 'image/svg+xml', 'image/bmp'].forEach(tipo =>
        expect(service.validarFormato(`data:${tipo};base64,AAAA`).message)
          .withContext(tipo).toBe('Solo se permiten imágenes JPG, PNG o WebP'));
    });

    it('debería rechazar lo que no es una imagen', () => {
      expect(service.validarFormato('data:text/html;base64,AAAA').message).toBe('Formato de imagen no válido');
      expect(service.validarFormato('https://sitio.cl/foto.jpg').message).toBe('Formato de imagen no válido');
    });

    it('debería rechazar una imagen sin codificación base64', () => {
      expect(service.validarFormato('data:image/png,AAAA').message).toBe('Tipo de imagen no detectado');
    });

    it('debería rechazar una entrada vacía', () => {
      expect(service.validarFormato('').message).toBe('No se recibió imagen');
    });

    it('debería no rechazar por tamaño (el tamaño se revisa después de comprimir)', () => {
      expect(service.validarFormato(imagenDeLargo(LARGO_MAX_2MB * 3)).valid).toBeTrue();
    });
  });

  // =========================
  // ✅ FORMATO + TAMAÑO
  // =========================
  describe('validarFoto', () => {
    it('debería aceptar una imagen de hasta 2 MB', () => {
      expect(service.validarFoto(imagenDeLargo(LARGO_MAX_2MB))).toEqual({ valid: true, message: '' });
    });

    it('debería rechazar una imagen de más de 2 MB', () => {
      expect(service.validarFoto(imagenDeLargo(LARGO_MAX_2MB + 1)))
        .toEqual({ valid: false, message: 'La imagen no puede superar 2MB' });
    });

    it('debería informar primero un problema de formato', () => {
      expect(service.validarFoto(imagenDeLargo(LARGO_MAX_2MB + 1, 'image/gif')).message)
        .toBe('Solo se permiten imágenes JPG, PNG o WebP');
    });
  });

  // =========================
  // 🗜️ COMPRESIÓN (canvas real del navegador)
  // =========================
  describe('comprimirFoto', () => {
    it('debería reducir una imagen grande a 400 px manteniendo la proporción', async () => {
      const comprimida = await service.comprimirFoto(crearImagen(1200, 600));
      const img = await cargarImagen(comprimida);

      expect(img.width).toBe(400);
      expect(img.height).toBe(200);
    });

    it('debería limitar también por el alto en imágenes verticales', async () => {
      const img = await cargarImagen(await service.comprimirFoto(crearImagen(600, 1200)));

      expect(img.width).toBe(200);
      expect(img.height).toBe(400);
    });

    it('debería no agrandar una imagen pequeña', async () => {
      const img = await cargarImagen(await service.comprimirFoto(crearImagen(100, 50)));

      expect(img.width).toBe(100);
      expect(img.height).toBe(50);
    });

    it('debería convertir a JPEG', async () => {
      expect(await service.comprimirFoto(crearImagen(50, 50))).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('debería poner fondo blanco a las zonas transparentes', async () => {
      const img = await cargarImagen(await service.comprimirFoto(crearImagen(20, 20, { transparente: true })));

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const [r, g, b] = Array.from(ctx.getImageData(10, 10, 1, 1).data);

      expect(r).toBeGreaterThan(250);
      expect(g).toBeGreaterThan(250);
      expect(b).toBeGreaterThan(250);
    });

    it('debería rechazar datos que no son una imagen real', async () => {
      await expectAsync(service.comprimirFoto('data:image/png;base64,no-es-imagen'))
        .toBeRejectedWithError('Error al cargar la imagen');
    });

    it('debería aceptar una foto de más de 2 MB si se valida el formato, se comprime y luego el tamaño', async () => {
      const original = crearImagen(1200, 1000, { ruido: true });

      // Sin comprimir supera el límite...
      expect(service.validarFoto(original).valid).toBeFalse();

      // ...pero el orden correcto la acepta
      expect(service.validarFormato(original).valid).toBeTrue();
      const comprimida = await service.comprimirFoto(original);
      expect(service.validarFoto(comprimida)).toEqual({ valid: true, message: '' });
      expect(comprimida.length).toBeLessThan(original.length);
    });
  });

  // =========================
  // 💾 ALMACENAMIENTO LOCAL
  // =========================
  describe('foto de perfil en el dispositivo', () => {
    let almacen: Record<string, string>;

    beforeEach(() => {
      almacen = {};
      spyOn(localStorage, 'getItem').and.callFake((k: string) => almacen[k] ?? null);
      spyOn(localStorage, 'setItem').and.callFake((k: string, v: string) => { almacen[k] = v; });
      spyOn(localStorage, 'removeItem').and.callFake((k: string) => { delete almacen[k]; });
    });

    it('debería guardar, cargar y eliminar la foto de cada usuario por separado', async () => {
      expect(await service.guardarFoto('u1', 'foto-1')).toBe('foto-1');
      await service.guardarFoto('u2', 'foto-2');

      expect(service.cargarFoto('u1')).toBe('foto-1');
      expect(service.cargarFoto('u2')).toBe('foto-2');

      await service.eliminarFoto('u1');

      expect(service.cargarFoto('u1')).toBeNull();
      expect(service.cargarFoto('u2')).toBe('foto-2');
    });
  });
});
