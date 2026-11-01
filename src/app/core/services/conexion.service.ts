// src/app/core/services/conexion.service.ts
import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

/**
 * Estado de la conexión a internet del dispositivo.
 *
 * Usa los eventos 'online'/'offline' del navegador, que funcionan igual en
 * PC y dentro del WebView de Capacitor (Android/iOS), sin plugins extra.
 */
@Injectable({ providedIn: 'root' })
export class ConexionService {

  private ngZone = inject(NgZone);
  private online = new BehaviorSubject<boolean>(navigator.onLine);

  readonly online$ = this.online.pipe(distinctUntilChanged());

  constructor() {
    window.addEventListener('online', () => this.actualizar(true));
    window.addEventListener('offline', () => this.actualizar(false));
  }

  get estaOnline(): boolean {
    return this.online.value;
  }

  private actualizar(valor: boolean) {
    // Los eventos de window pueden llegar fuera de Angular
    this.ngZone.run(() => this.online.next(valor));
  }
}
