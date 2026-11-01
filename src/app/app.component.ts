// src/app/app.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';

import { App } from '@capacitor/app';
import { NavigationEnd, NavigationError, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { TerminosControlService } from 'src/app/core/services/terminos-control.service';
import { generarCodigoError, esErrorDeCarga, esErrorDePermisosPorSesionCerrada } from 'src/app/core/utils/error-utils';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent
  implements OnInit, OnDestroy {

  private backButtonListener: any;
  private routerEventsSub: any;
  private authSub: any;
  private uidActual: string | null = null;

  constructor(
    private weatherGlobal: WeatherGlobalService,
    private timeService: TimeService,
    private router: Router,
    private toastCtrl: ToastController,
    private authService: AuthService,
    private terminosControl: TerminosControlService
  ) {}


  // =========================================================
  // 🚀 INICIO
  // =========================================================

  async ngOnInit() {

    // 🕐 Reloj global
    this.timeService.startClock();


    // 📡 Actualizar clima al desplazarse
    await this.weatherGlobal.startLocationTracking();


  // 📱 Botón atrás Android
  this.backButtonListener = await App.addListener(
    'backButton',
    ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }
    }
  );

  // 🧯 Errores al navegar (ej. falla al cargar el módulo de una pantalla
  // por corte de red, o por una versión vieja de la app en caché). Esto
  // es distinto de GlobalErrorHandler: son errores que el propio Router
  // atrapa internamente y no siempre llegan a ErrorHandler.
  this.routerEventsSub = this.router.events.subscribe((event) => {
    if (event instanceof NavigationError) {
      this.manejarErrorDeNavegacion(event);
    }

    // 📄 Re-aceptación de términos al navegar (nueva versión publicada)
    if (event instanceof NavigationEnd) {
      this.terminosControl.verificarAlNavegar(event.urlAfterRedirects);
    }
  });

  // 📄 Re-aceptación de términos al iniciar sesión / abrir la app con sesión activa
  this.authSub = this.authService.currentUser$.subscribe((user) => {
    const uid = user?.uid ?? null;
    if (uid === this.uidActual) return;
    this.uidActual = uid;

    if (uid) {
      this.terminosControl.verificarAlNavegar(this.router.url);
    } else {
      this.terminosControl.reiniciarSesion();
    }
  });
}


  // =========================================================
  // 🧹 DESTRUIR
  // =========================================================

  async ngOnDestroy() {

    await this.weatherGlobal
      .stopLocationTracking();


    await this.backButtonListener
      ?.remove();

    this.routerEventsSub?.unsubscribe();
    this.authSub?.unsubscribe();
  }

  // =========================================================
  // 🧯 ERRORES DE NAVEGACIÓN
  // =========================================================

  private async manejarErrorDeNavegacion(event: NavigationError) {
    const codigo = generarCodigoError();

    // 🔒 Detalle técnico solo en consola, nunca en pantalla.
    console.error(`[AppComponent] Error de navegación ${codigo} en "${event.url}"`, event.error);

    if (esErrorDePermisosPorSesionCerrada(event.error)) {
      return;
    }

    if (esErrorDeCarga(event.error)) {
      const toast = await this.toastCtrl.create({
        message: 'Hay una nueva versión de la app disponible. Actualizando…',
        color: 'warning',
        duration: 2000,
        position: 'top'
      });
      await toast.present();
      setTimeout(() => window.location.reload(), 1200);
      return;
    }

    // 🔒 Navegación "dura", igual que en GlobalErrorHandler: evita que la
    // app quede pegada si el error ocurrió en medio de una navegación.
    window.location.href = `/error?codigo=${encodeURIComponent(codigo)}`;
  }

}