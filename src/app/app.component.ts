import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

import { Component, OnDestroy, OnInit } from '@angular/core';

import { App } from '@capacitor/app';
import { Router } from '@angular/router';

import { Fullscreen } from '@boengli/capacitor-fullscreen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {

  private backButtonListener: any;

  constructor(
    private weatherGlobal: WeatherGlobalService,
    private timeService: TimeService,
    private router: Router
  ) {}

  async ngOnInit() {

    // 🌤️ Clima global
    this.weatherGlobal.loadWeather();

    // 🕐 Reloj global
    this.timeService.startClock();

    // 📱 BOTÓN ATRÁS DE ANDROID
    this.backButtonListener = await App.addListener(
      'backButton',
      ({ canGoBack }) => {

        if (canGoBack) {

          window.history.back();

        } else {

          this.router.navigateByUrl(
            '/tabs/home',
            { replaceUrl: true }
          );

        }

      }
    );

    // 🖥️ MODO PANTALLA COMPLETA
    await this.activarPantallaCompleta();

  }

  private async activarPantallaCompleta() {

    // Solo Android
    if (this.esAndroid()) {

      try {

        await Fullscreen.activateImmersiveMode();

        console.log('✅ Modo pantalla completa activado');

      } catch (error) {

        console.error(
          '❌ No se pudo activar pantalla completa:',
          error
        );

      }

    }

  }

  private esAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  async ngOnDestroy() {

    // 🧹 Limpiar listener del botón atrás
    await this.backButtonListener?.remove();

  }

}