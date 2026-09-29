import { Component, OnDestroy, OnInit } from '@angular/core';

import { App } from '@capacitor/app';
import { NavigationError, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';
import { generarCodigoError, esErrorDeCarga } from 'src/app/core/utils/error-utils';

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

  constructor(
    private weatherGlobal: WeatherGlobalService,
    private timeService: TimeService,
    private router: Router,
    private toastCtrl: ToastController
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
  }

  // =========================================================
  // 🧯 ERRORES DE NAVEGACIÓN
  // =========================================================

  private async manejarErrorDeNavegacion(event: NavigationError) {
    const codigo = generarCodigoError();

    // 🔒 Detalle técnico solo en consola, nunca en pantalla.
    console.error(`[AppComponent] Error de navegación ${codigo} en "${event.url}"`, event.error);

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

    // 🔒 Igual que en GlobalErrorHandler: navegación dura, no router.navigate().
    window.location.href = `/error?codigo=${encodeURIComponent(codigo)}`;
  }

}