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
    // Acepta formatos: +56912345678, 912345678, +1234567890
    const regex = /^\+?[\d\s\-]{8,15}$/;
    return regex.test(phone.trim());
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
}