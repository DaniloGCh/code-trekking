// src/app/app.component.ts
import { Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
  private ngZone = inject(NgZone);

  // ⏳ Pantalla de carga inicial
  cargandoApp = true;
  splashSaliendo = false;

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

    // ⏳ Se inicia antes que todo lo demás (el clima puede demorar por permisos)
    this.iniciarPantallaCarga();

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
  // ⏳ PANTALLA DE CARGA INICIAL
  // =========================================================
  // Se mantiene visible hasta saber si hay sesión y, si la hay, hasta tener
  // los datos del usuario. Así no se alcanza a ver la pantalla de
  // "Iniciar sesión" cuando la sesión ya estaba iniciada.

  private iniciarPantallaCarga() {
    const inicio = Date.now();
    let ocultada = false;

    const ocultar = () => {
      if (ocultada) return;
      ocultada = true;

      // Mínimo visible para que no parpadee si Firebase responde muy rápido
      const espera = Math.max(0, 800 - (Date.now() - inicio));

      this.ngZone.run(() => {
        setTimeout(() => {
          this.splashSaliendo = true; // animación de salida
          setTimeout(() => (this.cargandoApp = false), 400);
        }, espera);
      });
    };

    // Seguridad: si Firebase no responde, no dejar la app tapada
    setTimeout(ocultar, 8000);

    firstValueFrom(this.authService.currentUser$)
      .then(async (user) => {
        if (user) {
          await this.authService.getCurrentUserData().catch(() => null);
        }
        ocultar();
      })
      .catch(ocultar);
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