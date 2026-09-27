import { Component, OnInit, AfterViewInit, inject, NgZone, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ViewWillEnter } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { TipoCambioService } from 'src/app/core/services/tipo-cambio.service';
import { environment } from 'src/environments/environment';
import { Subscription } from 'rxjs';

import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
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
  private tipoCambioService = inject(TipoCambioService);
  private ngZone = inject(NgZone);

  /**
   * Tasa CLP por 1 USD. Arranca con la tasa de respaldo del servicio y se
   * reemplaza por la tasa real apenas responde la API (ver ngOnInit). Así
   * el botón de pago nunca queda bloqueado esperando la red.
   */
  private tasaCLPxUSD = this.tipoCambioService.TASA_RESPALDO;

  /** Tolerancia mínima para absorber la diferencia entre dos consultas
   *  independientes de tipo de cambio (pagos.page.ts y checkout-web
   *  consultan la API por separado). NUNCA se usa para aceptar un pago
   *  menor al esperado, solo para no rechazar por céntimos de diferencia
   *  en el tipo de cambio. */
  private readonly TOLERANCIA_MONTO = 0.03; // 3%

  private routeSub?: Subscription;
  private appUrlListener?: PluginListenerHandle;

  private readonly planes: Record<PlanKey, PlanInfo> = {
    mensual: { nombre: 'Plan Mensual', precioCLP: 4000, precioDisplay: '$4.000 CLP' },
    trimestral: { nombre: 'Plan Trimestral (3 Meses)', precioCLP: 10000, precioDisplay: '$10.000 CLP' },
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
    return (this.plan.precioCLP / this.tasaCLPxUSD).toFixed(2);
  }

  /**
   * 🔒 Único punto de verdad para validar un pago: acepta el monto SOLO
   * si es igual o mayor al precio esperado del plan indicado (con un
   * margen mínimo para no rechazar por diferencias de céntimos entre dos
   * consultas de tipo de cambio distintas). Si no hay monto para
   * verificar, se rechaza por defecto (fail-closed) — nunca se activa
   * una suscripción "a ciegas".
   * Se usa igual para los 3 planes (mensual, trimestral, anual) y para
   * los 2 flujos de pago (botón web embebido y retorno desde checkout-web).
   */
  private montoEsSuficiente(montoCapturado: string | number | null | undefined, planAVerificar: PlanKey): boolean {
    if (montoCapturado === null || montoCapturado === undefined || montoCapturado === '') {
      return false;
    }
    const recibido = typeof montoCapturado === 'number' ? montoCapturado : parseFloat(montoCapturado);
    if (!isFinite(recibido)) {
      return false;
    }

    const precioClp = this.planes[planAVerificar].precioCLP;
    const esperado = precioClp / this.tasaCLPxUSD;
    const minimoAceptado = esperado * (1 - this.TOLERANCIA_MONTO);

    return recibido >= minimoAceptado;
  }

  /** Extrae el monto realmente capturado por PayPal desde la respuesta de order.capture(). */
  private extraerMontoCapturado(orden: any): string | null {
    try {
      return orden?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? null;
    } catch {
      return null;
    }
  }

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const planParam = params.get('plan') as PlanKey | null;
      if (planParam && this.planes[planParam]) {
        this.planKey = planParam;
        this.plan = this.planes[planParam];
      }
    });

    // Consulta la tasa real apenas se abre la página; mientras tanto se usa
    // la tasa de respaldo, así el usuario nunca ve la página bloqueada.
    this.tipoCambioService.obtenerTasaClpPorUsd().then((tasa) => {
      this.ngZone.run(() => {
        this.tasaCLPxUSD = tasa;
      });
    });

    if (this.esNativo) {
      this.registrarListenerRetorno();
    }
  }

  ionViewWillEnter() {
    this.actualizarPlanDesdeUrl();

    if (!this.esNativo && (window as any).paypal) {
      this.renderBotonesPaypal();
    }
  }

  ngAfterViewInit() {
    if (this.esNativo) {
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
            const montoCapturado = this.extraerMontoCapturado(orden);
            if (!this.montoEsSuficiente(montoCapturado, this.planKey)) {
              console.error(
                `[PagosPage] Monto capturado (${montoCapturado}) insuficiente para el plan ${this.planKey} (esperado >= ${this.precioCalculadoUSD}).`
              );
              await this.mostrarError(
                'El monto pagado no cubre el precio del plan. Contacta a soporte con tu comprobante de PayPal antes de reintentar.'
              );
              return;
            }
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

  /** Llamado desde el botón "Pagar con PayPal" cuando esNativo === true */
  async pagarNativo() {
    if (!environment.paypalCheckoutUrl) {
      await this.mostrarError('Falta configurar la URL de checkout (PAYPAL_CHECKOUT_URL).');
      return;
    }

    // Nota: se envía `amount` solo como referencia/registro; checkout-web
    // vuelve a calcular el monto real por su cuenta (ver script.js) y no
    // confía en este valor para cobrar.
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
      const montoRecibido = params.get('monto');

      this.ngZone.run(async () => {
        if (planParam && this.planes[planParam]) {
          this.planKey = planParam;
          this.plan = this.planes[planParam];
        }

        if (status === 'success' && orderId) {
          // 🔒 Mismo criterio que el flujo web: se exige monto igual o
          // mayor al precio del plan (ver montoEsSuficiente).
          if (!this.montoEsSuficiente(montoRecibido, this.planKey)) {
            console.error(
              `[PagosPage] Monto recibido (${montoRecibido}) insuficiente para el plan ${this.planKey} (esperado >= ${this.precioCalculadoUSD}).`
            );
            await this.mostrarError(
              'El monto cobrado no cubre el precio del plan. Contacta a soporte con tu comprobante de PayPal antes de reintentar.'
            );
            return;
          }
          await this.finalizarPago(orderId);
        } else {
          await this.mostrarError('El pago fue cancelado o no se completó.');
        }
      });
    }).then((handle) => {
      this.appUrlListener = handle;
    });
  }

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