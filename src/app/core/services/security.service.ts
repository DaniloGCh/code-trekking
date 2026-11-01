// src/app/core/services/security.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  // =========================
  // 🛡️ SANITIZAR INPUT (XSS)
  // =========================
  sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  // =========================
  // 🛡️ VALIDAR EMAIL
  // =========================
  isValidEmail(email: string): boolean {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email) && email.length <= 100;
  }

  // =========================
  // 🛡️ VALIDAR CONTRASEÑA FUERTE
  // =========================
  isStrongPassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Mínimo 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Debe tener al menos una mayúscula' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Debe tener al menos una minúscula' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Debe tener al menos un número' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Debe tener al menos un carácter especial' };
    }
    return { valid: true, message: '' };
  }

  // =========================
  // 🛡️ VALIDAR TEXTO SEGURO
  // =========================
  isSafeText(text: string, maxLength: number = 500): boolean {
    if (!text || text.length > maxLength) return false;

    // Detectar patrones peligrosos
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,    // onclick=, onload=, etc
      /eval\(/i,
      /document\./i,
      /window\./i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:text\/html/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(text));
  }

  // =========================
  // 🛡️ RATE LIMITING (CLIENT SIDE)
  // =========================
  private intentos: Map<string, { count: number; lastTime: number }> = new Map();

  checkRateLimit(accion: string, maxIntentos: number = 5, ventanaMs: number = 60000): boolean {
    const ahora = Date.now();
    const registro = this.intentos.get(accion);

    if (!registro || (ahora - registro.lastTime) > ventanaMs) {
      this.intentos.set(accion, { count: 1, lastTime: ahora });
      return true;
    }

    if (registro.count >= maxIntentos) {
      return false; // Bloqueado
    }

    registro.count++;
    return true;
  }

  resetRateLimit(accion: string) {
    this.intentos.delete(accion);
  }

  // =========================
  // 🛡️ RATE LIMITING PERSISTENTE (por usuario)
  // =========================
  // A diferencia de checkRateLimit (en memoria), guarda las marcas de tiempo
  // en localStorage, así no se reinicia si Android cierra la app.
  // Solo cuenta las acciones registradas con registrarAccionPersistente
  // (ej. eventos creados con éxito), no los intentos.
  checkPersistentRateLimit(
    accion: string,
    uid: string,
    max: number,
    ventanaMs: number
  ): { permitido: boolean; minutosRestantes: number } {
    const marcas = this.leerMarcas(accion, uid, ventanaMs);
    if (marcas.length < max) return { permitido: true, minutosRestantes: 0 };

    // Se libera un cupo cuando vence la marca que deja el conteo bajo el máximo
    const liberaEn = marcas[marcas.length - max] + ventanaMs - Date.now();
    return { permitido: false, minutosRestantes: Math.max(1, Math.ceil(liberaEn / 60000)) };
  }

  registrarAccionPersistente(accion: string, uid: string, ventanaMs: number) {
    const marcas = this.leerMarcas(accion, uid, ventanaMs);
    marcas.push(Date.now());
    try {
      localStorage.setItem(this.claveRateLimit(accion, uid), JSON.stringify(marcas));
    } catch {
      // Sin almacenamiento disponible: no se puede persistir el conteo
    }
  }

  private leerMarcas(accion: string, uid: string, ventanaMs: number): number[] {
    const desde = Date.now() - ventanaMs;
    try {
      const guardado = JSON.parse(localStorage.getItem(this.claveRateLimit(accion, uid)) || '[]');
      return Array.isArray(guardado)
        ? guardado.filter((t: unknown): t is number => typeof t === 'number' && t > desde).sort((a, b) => a - b)
        : [];
    } catch {
      return [];
    }
  }

  private claveRateLimit(accion: string, uid: string): string {
    return `rate-limit:${accion}:${uid}`;
  }

  // =========================
  // 🛡️ VALIDAR URL SEGURA
  // =========================
  isSafeUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const allowedProtocols = ['https:'];
      const allowedDomains = ['wikiloc.com', 'es.wikiloc.com'];
      return allowedProtocols.includes(parsed.protocol) &&
        allowedDomains.some(d => parsed.hostname.endsWith(d));
    } catch {
      return false;
    }
  }

  // =========================
  // 🛡️ GENERAR TOKEN CSRF
  // =========================
  generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // =========================
  // 🛡️ LIMPIAR DATOS SENSIBLES
  // =========================
  clearSensitiveData(obj: any): any {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'respuestaSeguridad'];
    const cleaned = { ...obj };
    sensitiveKeys.forEach(key => {
      if (cleaned[key]) delete cleaned[key];
    });
    return cleaned;
  }

  // =========================
  // 🛡️ VALIDAR TELÉFONO
  // =========================
  isValidPhone(phone: string): boolean {
    // Se quitan espacios y guiones antes de validar, para aceptar que la
    // persona lo escriba con separadores (+56 9 8180 0532), pero el
    // resultado debe ser EXACTAMENTE un celular chileno válido:
    //   +569XXXXXXXX  (12 caracteres: +56, 9 y 8 dígitos)
    //   9XXXXXXXX     (9 caracteres: 9 y 8 dígitos, sin código de país)
    const limpio = phone.trim().replace(/[\s\-]/g, '');
    const regex = /^(\+569\d{8}|9\d{8})$/;
    return regex.test(limpio);
  }

  // =========================
  // 🛡️ VALIDAR NOMBRE SEGURO
  // =========================
  isValidNombre(nombre: string, min: number = 3, max: number = 50): boolean {
    if (!nombre || nombre.trim().length < min || nombre.trim().length > max) return false;
    // Solo letras, espacios, tildes y guiones
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-']+$/;
    return regex.test(nombre.trim());
  }

  // =========================
  // 🛡️ NORMALIZAR NOMBRE
  // =========================
  // Limpia lo que agregan los teclados móviles antes de validar:
  // tildes en forma descompuesta (NFD), apóstrofo tipográfico (’),
  // espacios dobles / no separables y espacios al inicio o fin.
  normalizeNombre(nombre: string): string {
    if (!nombre) return '';
    return nombre
      .normalize('NFC')
      .replace(/[‘’ʼ]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Revierte las entidades que genera sanitizeInput (se repite por si el
  // texto quedó sanitizado dos veces, ej. nombres guardados en el registro)
  decodeEntities(texto: string): string {
    if (!texto) return '';
    let actual = texto;
    for (let i = 0; i < 3; i++) {
      const decodificado = actual
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/gi, "'")
        .replace(/&#x2F;/gi, '/')
        .replace(/&amp;/g, '&');
      if (decodificado === actual) break;
      actual = decodificado;
    }
    return actual;
  }

  // =========================
  // 🛡️ VALIDAR COORDENADAS GPS
  // =========================
  isValidCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' && typeof lng === 'number' &&
      !isNaN(lat) && !isNaN(lng) &&
      isFinite(lat) && isFinite(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }

  // =========================
  // 🛡️ VALIDAR ID DE FIRESTORE
  // =========================
  isValidFirestoreId(id: string): boolean {
    if (!id || id.trim().length === 0) return false;
    // IDs de Firestore son alfanuméricos, máx 128 chars
    const regex = /^[a-zA-Z0-9_\-]{1,128}$/;
    return regex.test(id);
  }
}