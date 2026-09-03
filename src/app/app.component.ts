import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';

import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Router } from '@angular/router';

import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';
import { PaypalNativeService, PlanKey } from 'src/app/core/services/paypal-native.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent
  implements OnInit, OnDestroy {

  private backButtonListener: any;
  private appUrlListener: any;

  constructor(
    private weatherGlobal: WeatherGlobalService,
    private timeService: TimeService,
    private router: Router,
    private zone: NgZone,
    private paypalNativeService: PaypalNativeService
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

  // 💳 Retorno del checkout de PayPal (Android/iOS) vía deep link codetrekking://
  this.appUrlListener = await App.addListener(
    'appUrlOpen',
    (event: URLOpenListenerEvent) => {
      this.zone.run(async () => {
        let url: URL;
        try {
          url = new URL(event.url);
        } catch {
          return;
        }

        if (url.protocol !== 'codetrekking:') {
          return; // no es un link nuestro, lo ignoramos
        }

        await Browser.close();

        if (url.hostname === 'payment-success') {
          const orderId = url.searchParams.get('token') ?? undefined;
          const planKey = (url.searchParams.get('plan') ?? undefined) as PlanKey | undefined;
          this.paypalNativeService.notificarRetorno({ status: 'success', orderId, planKey });
        } else if (url.hostname === 'payment-cancel') {
          this.paypalNativeService.notificarRetorno({ status: 'cancel' });
        }
      });
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

    await this.appUrlListener
      ?.remove();
  }

}