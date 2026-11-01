// src/app/core/services/back-button.service.ts

import { Injectable } from '@angular/core';

// Devuelve true si la página manejó el "atrás" (ej. cerró un visor),
// o false para dejar que se navegue a la página anterior.
export type BackButtonHandler = () => boolean;

@Injectable({
  providedIn: 'root'
})
export class BackButtonService {

  // =========================
  // 📱 BOTÓN ATRÁS ANDROID
  // =========================
  // AppComponent consulta estos handlers antes de hacer history.back(),
  // para que una página pueda cerrar primero lo que tiene abierto
  // (visor de fotos, modo selección, etc.). El último registrado tiene prioridad.
  private handlers: BackButtonHandler[] = [];

  registrar(handler: BackButtonHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  manejar(): boolean {
    for (let i = this.handlers.length - 1; i >= 0; i--) {
      if (this.handlers[i]()) return true;
    }
    return false;
  }
}
