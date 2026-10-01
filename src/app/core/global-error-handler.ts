// src/app/core/global-error-handler.ts
import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { generarCodigoError, esErrorDeCarga, esErrorDePermisosPorSesionCerrada } from './utils/error-utils';

/**
 * Captura cualquier error no atrapado en la app (en cualquier componente,
 * servicio o suscripción) y evita que la persona vea una pantalla en
 * blanco/negra o un stack trace técnico en pantalla:
 *
 *  - Siempre registra el detalle técnico completo en la consola (solo
 *    visible para quien abra las herramientas de desarrollador, nunca
 *    se muestra en pantalla).
 *  - Muestra un toast breve con un código de referencia corto.
 *  - Redirige a la página /error con ese mismo código.
 *  - Si detecta que la falla es por una versión vieja de la app en caché
 *    (chunk load error), en vez de lo anterior avisa y recarga solo.
 *
 * Funciona igual en navegador (PC) y en la app nativa (Android/iOS): el
 * ToastController de Ionic se comporta igual en las dos plataformas.
 *
 * Se registra en app.module.ts:
 *   { provide: ErrorHandler, useClass: GlobalErrorHandler }
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  // Se inyecta el Injector (no Router/ToastController directo) porque
  // ErrorHandler se crea muy temprano en el arranque de la app, antes de
  // que el resto de los servicios estén listos; con el Injector se
  // resuelven recién cuando ocurre el primer error.
  constructor(private injector: Injector, private ngZone: NgZone) {}

  handleError(error: any): void {
    const codigo = generarCodigoError();

    // 🔒 El detalle técnico SOLO va a la consola, nunca se muestra en pantalla.
    console.error(`[GlobalErrorHandler] ${codigo}`, error);

    // Rechazos de permisos de Firestore justo al cerrar sesión: es un
    // efecto secundario esperado, no un bug real. Se registra pero no se
    // interrumpe al usuario (la app ya navegó a donde correspondía).
    if (esErrorDePermisosPorSesionCerrada(error)) {
      return;
    }

    // Los errores del router/zona pueden ocurrir fuera de Angular; ngZone.run
    // asegura que la UI (toast) se actualice correctamente.
    this.ngZone.run(() => {
      if (esErrorDeCarga(error)) {
        this.avisarYRecargar();
        return;
      }
      this.mostrarErrorAlUsuario(codigo);
    });
  }

  private async avisarYRecargar() {
    try {
      const toastCtrl = this.injector.get(ToastController);
      const toast = await toastCtrl.create({
        message: 'Hay una nueva versión de la app disponible. Actualizando…',
        color: 'warning',
        duration: 2000,
        position: 'top'
      });
      await toast.present();
    } finally {
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  private async mostrarErrorAlUsuario(codigo: string) {
    try {
      const toastCtrl = this.injector.get(ToastController);
      const toast = await toastCtrl.create({
        message: `Ocurrió un error inesperado. Código: ${codigo}`,
        color: 'danger',
        duration: 3000,
        position: 'top',
        buttons: [{ text: 'OK', role: 'cancel' }]
      });
      await toast.present();
    } catch {
      // Si ni el propio Toast logra crearse (caso extremo), no hay más que
      // hacer desde aquí: el detalle completo ya quedó en la consola.
    }

    // 🔒 Navegación "dura" (no usa el Router de Angular): si el error
    // ocurrió justo durante una navegación, el Router puede quedar
    // atascado y router.navigate() nunca resolver, dejando la app pegada.
    // window.location sortea eso por completo, siempre funciona.
    setTimeout(() => {
      window.location.href = `/error?codigo=${encodeURIComponent(codigo)}`;
    }, 1500);
  }
}