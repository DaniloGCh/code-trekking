// src/app/core/services/foto.service.ts

import { Injectable } from '@angular/core';

export interface FotoResult {
  base64: string;
  size: number;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class FotoService {

  // =========================
  // ⚙️ CONFIGURACIÓN
  // =========================
  private readonly MAX_SIZE_MB = 2;
  private readonly MAX_WIDTH = 400;
  private readonly MAX_HEIGHT = 400;
  private readonly QUALITY = 0.7;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly STORAGE_KEY = 'user_profile_photo';

  // =========================
  // ✅ VALIDAR FOTO
  // =========================
  validarFoto(base64: string): { valid: boolean; message: string } {
    if (!base64) return { valid: false, message: 'No se recibió imagen' };

    // ✅ Validar que sea un Base64 real
    if (!base64.startsWith('data:image/')) {
      return { valid: false, message: 'Formato de imagen no válido' };
    }

    // ✅ Validar tipo de imagen
    const tipoMatch = base64.match(/data:([^;]+);base64,/);
    if (!tipoMatch) return { valid: false, message: 'Tipo de imagen no detectado' };

    const tipo = tipoMatch[1];
    if (!this.ALLOWED_TYPES.includes(tipo)) {
      return { valid: false, message: 'Solo se permiten imágenes JPG, PNG o WebP' };
    }

    // ✅ Validar tamaño
    const sizeBytes = (base64.length * 3) / 4;
    const sizeMB = sizeBytes / (1024 * 1024);

    if (sizeMB > this.MAX_SIZE_MB) {
      return { valid: false, message: `La imagen no puede superar ${this.MAX_SIZE_MB}MB` };
    }

    return { valid: true, message: '' };
  }

  // =========================
  // 🗜️ COMPRIMIR FOTO
  // =========================
  async comprimirFoto(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');

        // ✅ Calcular dimensiones manteniendo aspecto
        let { width, height } = img;

        if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
          const ratio = Math.min(
            this.MAX_WIDTH / width,
            this.MAX_HEIGHT / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo obtener contexto canvas'));

        // ✅ Fondo blanco para imágenes con transparencia
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // ✅ Comprimir a JPEG con calidad definida
        const comprimida = canvas.toDataURL('image/jpeg', this.QUALITY);
        resolve(comprimida);
      };

      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = base64;
    });
  }

  // =========================
  // 💾 GUARDAR EN LOCALSTORAGE
  // ⚡ PUNTO DE MIGRACIÓN A FIREBASE STORAGE
  // =========================
  async guardarFoto(uid: string, base64: string): Promise<string> {
    const key = `${this.STORAGE_KEY}_${uid}`;
    // 🔥 CUANDO MIGRES A FIREBASE STORAGE:
    // 1. Elimina el código de localStorage
    // 2. Descomenta el código de Storage
    // 3. Retorna la URL de descarga

    // ─── FIREBASE STORAGE (futuro) ───────────────────────────
    // const storage  = getStorage();
    // const photoRef = ref(storage, `fotos_perfil/${uid}.jpg`);
    // await uploadString(photoRef, base64, 'data_url');
    // return await getDownloadURL(photoRef);
    // ─────────────────────────────────────────────────────────

    // ─── LOCALSTORAGE (actual) ────────────────────────────────
    localStorage.setItem(key, base64);
    return base64;
    // ─────────────────────────────────────────────────────────
  }

  // =========================
  // 📥 CARGAR FOTO
  // ⚡ PUNTO DE MIGRACIÓN A FIREBASE STORAGE
  // =========================
  cargarFoto(uid: string): string | null {
    // 🔥 CUANDO MIGRES A FIREBASE STORAGE:
    // Retorna la URL guardada en Firestore en userData.fotoUrl

    const key = `${this.STORAGE_KEY}_${uid}`;
    return localStorage.getItem(key);
  }

  // =========================
  // 🗑️ ELIMINAR FOTO
  // ⚡ PUNTO DE MIGRACIÓN A FIREBASE STORAGE
  // =========================
  async eliminarFoto(uid: string): Promise<void> {
    // 🔥 CUANDO MIGRES A FIREBASE STORAGE:
    // const storage  = getStorage();
    // const photoRef = ref(storage, `fotos_perfil/${uid}.jpg`);
    // await deleteObject(photoRef);

    const key = `${this.STORAGE_KEY}_${uid}`;
    localStorage.removeItem(key);
  }
}