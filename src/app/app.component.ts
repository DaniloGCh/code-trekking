import { Component, OnDestroy, OnInit } from '@angular/core';

import { App } from '@capacitor/app';
import { Router } from '@angular/router';

import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent
  implements OnInit, OnDestroy {

  private backButtonListener: any;

  constructor(
    private weatherGlobal: WeatherGlobalService,
    private timeService: TimeService,
    private router: Router
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
}


  // =========================================================
  // 🧹 DESTRUIR
  // =========================================================

  async ngOnDestroy() {

    await this.weatherGlobal
      .stopLocationTracking();


    await this.backButtonListener
      ?.remove();
  }

}