// src/app/core/services/session.service.ts

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class SessionService {

  private router = inject(Router);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  private timeout: any;
  private warningTimeout: any;
  private activo = false;

  // ⏱️ 30 minutos de inactividad para admin
  private readonly INACTIVIDAD_MS = 30 * 60 * 1000;
  // ⚠️ Advertencia 2 minutos antes
  private readonly WARNING_MS = 28 * 60 * 1000;

  private readonly EVENTOS = ['click', 'touchstart', 'keypress', 'scroll', 'mousemove'];

  // ✅ Iniciar timer solo para admin
  iniciarTimerAdmin() {
    if (this.activo) return;
    this.activo = true;

    this.EVENTOS.forEach(event => {
      document.addEventListener(event, this.onActividad, { passive: true });
    });

    this.resetTimer();
  }

  // ✅ Detener timer
  detenerTimer() {
    if (!this.activo) return;
    this.activo = false;

    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);

    this.EVENTOS.forEach(event => {
      document.removeEventListener(event, this.onActividad);
    });
  }

  // ✅ Arrow function para mantener el contexto
  private onActividad = () => {
    this.resetTimer();
  };

  private resetTimer() {
    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);

    // ⚠️ Advertencia 2 minutos antes
    this.warningTimeout = setTimeout(async () => {
      await this.mostrarAdvertencia();
    }, this.WARNING_MS);

    // 🚪 Cerrar sesión por inactividad
    this.timeout = setTimeout(async () => {
      await this.cerrarSesionPorInactividad();
    }, this.INACTIVIDAD_MS);
  }

  private async mostrarAdvertencia() {
    const toast = await this.toastCtrl.create({
      message: '⚠️ Tu sesión cerrará en 2 minutos por inactividad',
      duration: 5000,
      color: 'warning',
      position: 'top',
      buttons: [
        {
          text: 'Continuar',
          handler: () => this.resetTimer() // ✅ Resetea el timer si presiona continuar
        }
      ]
    });
    await toast.present();
  }

  private async cerrarSesionPorInactividad() {
    this.detenerTimer();

    const toast = await this.toastCtrl.create({
      message: '🔒 Sesión cerrada por inactividad',
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();

    await this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}