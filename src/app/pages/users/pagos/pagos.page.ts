import { Component, OnInit, AfterViewInit, inject, NgZone, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ViewWillEnter } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';
import { Subscription } from 'rxjs';

import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent, PluginListenerHandle } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

type PlanKey = 'mensual' | 'trimestral' | 'anual';

interface PlanInfo {
  nombre: string;
  precioCLP: number;
  precioDisplay: string;
}

@Component({
  selector: 'app-pagos',
  templateUrl: './pagos.page.html',
  styleUrls: ['./pagos.page.scss'],
  standalone: false,
})
export class PagosPage implements OnInit, AfterViewInit, ViewWillEnter, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  private readonly TASA_CAMBIO_USD = 950;
  private routeSub?: Subscription;
  private appUrlListener?: PluginListenerHandle;

  private readonly planes: Record<PlanKey, PlanInfo> = {
    mensual: { nombre: 'Plan Mensual', precioCLP: 4000, precioDisplay: '$4.000 CLP' },
    trimestral: { nombre: 'Plan Trimestral (4 Meses)', precioCLP: 13350, precioDisplay: '$13.350 CLP' },
    anual: { nombre: 'Plan Anual (12 Meses)', precioCLP: 39000, precioDisplay: '$39.000 CLP' }
  };

  planKey: PlanKey = 'mensual';
  plan: PlanInfo = this.planes.mensual;

  /** true en Android/iOS empaquetados con Capacitor; false en navegador web */
  readonly esNativo = Capacitor.isNativePlatform();

  sdkListo = false;
  errorSdk = false;
  procesandoRetorno = false;

  get precioCalculadoUSD(): string {
    return (this.plan.precioCLP / this.TASA_CAMBIO_USD).toFixed(2);
  }

  ngOnInit() {
    // 🔹 Escucha cambios reactivos en la URL por si la vista sigue viva en el stack de Ionic
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const planParam = params.get('plan') as PlanKey | null;
      if (planParam && this.planes[planParam]) {
        this.planKey = planParam;
        this.plan = this.planes[planParam];
      }
    });

    // 🔹 En nativo, escuchamos el deep link de retorno del checkout de PayPal
    if (this.esNativo) {
      this.registrarListenerRetorno();
    }
  }

  /* 🔹 Ciclo de vida de Ionic: Se dispara SIEMPRE que se entra a la pantalla */
  ionViewWillEnter() {
    this.actualizarPlanDesdeUrl();

    // Si la SDK ya estaba cargada previamente (solo flujo web), renderiza de nuevo los botones
    if (!this.esNativo && (window as any).paypal) {
      this.renderBotonesPaypal();
    }
  }

  ngAfterViewInit() {
    if (this.esNativo) {
      // En nativo no cargamos el SDK dentro del WebView: PayPal necesita un
      // contexto de navegador real (cookies/popups) que el WebView bloquea.
      // El botón "Pagar con PayPal" del template llama a pagarNativo().
      this.sdkListo = true;
      return;
    }

    setTimeout(() => {
      this.cargarSdkPaypal()
        .then(() => this.renderBotonesPaypal())
        .catch((err) => {
          console.error('[PagosPage] Error al cargar SDK:', err);
          this.ngZone.run(() => {
            this.errorSdk = true;
          });
        });
    }, 100);
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    this.appUrlListener?.remove();
  }

  private actualizarPlanDesdeUrl() {
    const planParam = this.route.snapshot.queryParamMap.get('plan') as PlanKey | null;
    if (planParam && this.planes[planParam]) {
      this.planKey = planParam;
      this.plan = this.planes[planParam];
    }
  }

  // ===========================================================
  // 🌐 FLUJO WEB (navegador de escritorio/móvil, sin Capacitor)
  // ===========================================================

  private cargarSdkPaypal(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).paypal) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=${environment.paypalCurrency}`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal'));
      document.body.appendChild(script);
    });
  }

  private renderBotonesPaypal() {
    const paypal = (window as any).paypal;
    if (!paypal) {
      this.errorSdk = true;
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (container) {
      container.innerHTML = '';
    }

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay'
      },

      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            description: `${this.plan.nombre} (${this.plan.precioDisplay})`,
            amount: {
              value: this.precioCalculadoUSD,
              currency_code: environment.paypalCurrency
            }
          }]
        });
      },

      onApprove: (_data: any, actions: any) => {
        return actions.order.capture().then((orden: any) => {
          this.ngZone.run(async () => {
            await this.finalizarPago(orden.id);
          });
        }).catch((err: any) => {
          console.error('[PagosPage] Error al capturar la orden:', err);
          this.ngZone.run(async () => {
            await this.mostrarError('Ocurrió un problema confirmando el pago.');
          });
        });
      },

      onError: (err: any) => {
        console.error('[PagosPage] Error SDK PayPal:', err);
        this.ngZone.run(async () => {
          await this.mostrarError('PayPal no pudo procesar el cobro. Revisa tu saldo o tarjeta.');
        });
      }

    }).render('#paypal-button-container');

    this.sdkListo = true;
  }

  // ===========================================================
  // 📱 FLUJO NATIVO (Android/iOS vía Capacitor)
  // ===========================================================

  /** Llamado desde el botón "Pagar con PayPal" cuando esNativo === true */
  async pagarNativo() {
    if (!environment.paypalCheckoutUrl) {
      await this.mostrarError('Falta configurar la URL de checkout (PAYPAL_CHECKOUT_URL).');
      return;
    }

    const url = `${environment.paypalCheckoutUrl}` +
      `?plan=${encodeURIComponent(this.planKey)}` +
      `&nombre=${encodeURIComponent(this.plan.nombre)}` +
      `&amount=${encodeURIComponent(this.precioCalculadoUSD)}` +
      `&currency=${encodeURIComponent(environment.paypalCurrency)}` +
      `&scheme=${encodeURIComponent(environment.appUrlScheme)}`;

    await Browser.open({ url, presentationStyle: 'popover' });
  }

  private registrarListenerRetorno() {
    App.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
      if (!data?.url?.startsWith(`${environment.appUrlScheme}://payment-return`)) {
        return;
      }

      Browser.close().catch(() => { /* puede que ya esté cerrado */ });

      const queryString = data.url.split('?')[1] ?? '';
      const params = new URLSearchParams(queryString);
      const status = params.get('status');
      const orderId = params.get('orderId');
      const planParam = params.get('plan') as PlanKey | null;

      this.ngZone.run(async () => {
        if (planParam && this.planes[planParam]) {
          this.planKey = planParam;
          this.plan = this.planes[planParam];
        }

        if (status === 'success' && orderId) {
          await this.finalizarPago(orderId);
        } else {
          await this.mostrarError('El pago fue cancelado o no se completó.');
        }
      });
    }).then((handle) => {
      this.appUrlListener = handle;
    });
  }

  // ===========================================================
  // ✅ COMÚN A AMBOS FLUJOS
  // ===========================================================

  private async finalizarPago(ordenId: string) {
    const loading = await this.loadingCtrl.create({ message: 'Activando tu suscripción...' });
    await loading.present();

    try {
      await this.authService.activarSuscripcion(this.planKey, ordenId);
      await loading.dismiss();

      const alert = await this.alertCtrl.create({
        header: '¡Gracias por tu suscripción! 🎉',
        message: `Tu ${this.plan.nombre} ya está activo. Ve a la pestaña Galería para ver tu contenido.`,
        buttons: ['Aceptar']
      });
      await alert.present();
      await alert.onDidDismiss();

      this.ngZone.run(() => {
        this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      });

    } catch (err: any) {
      console.error('[PagosPage] Error al activar la suscripción:', err);
      await loading.dismiss();
      await this.mostrarError('El pago fue aprobado, pero hubo un problema al actualizar tu cuenta.');
    }
  }

  private async mostrarError(mensajeCustom?: string) {
    const alert = await this.alertCtrl.create({
      header: 'No se pudo procesar el pago',
      message: mensajeCustom || 'Intenta nuevamente o vuelve más tarde.',
      buttons: ['Aceptar']
    });
    await alert.present();
  }

  volver() {
    this.router.navigateByUrl('/tabs/home');
  }
}
