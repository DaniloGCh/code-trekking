import { Component, OnInit, AfterViewInit, inject, NgZone, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ViewWillEnter } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { PaypalNativeService, RetornoPaypal } from 'src/app/core/services/paypal-native.service';

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
  private paypalNativeService = inject(PaypalNativeService);
  private ngZone = inject(NgZone);

  private readonly TASA_CAMBIO_USD = 950;
  private routeSub?: Subscription;
  private retornoSub?: Subscription;

  private readonly planes: Record<PlanKey, PlanInfo> = {
    mensual: { nombre: 'Plan Mensual', precioCLP: 4000, precioDisplay: '$4.000 CLP' },
    trimestral: { nombre: 'Plan Trimestral (4 Meses)', precioCLP: 13350, precioDisplay: '$13.350 CLP' },
    anual: { nombre: 'Plan Anual (12 Meses)', precioCLP: 39000, precioDisplay: '$39.000 CLP' }
  };

  planKey: PlanKey = 'mensual';
  plan: PlanInfo = this.planes.mensual;

  sdkListo = false;
  errorSdk = false;
  pagandoNativo = false;

  // 🔹 true en Android/iOS, false en navegador
  readonly esNativo = Capacitor.getPlatform() !== 'web';

  get precioCalculadoUSD(): string {
    return (this.plan.precioCLP / this.TASA_CAMBIO_USD).toFixed(2);
  }

  ngOnInit() {
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const planParam = params.get('plan') as PlanKey | null;
      if (planParam && this.planes[planParam]) {
        this.planKey = planParam;
        this.plan = this.planes[planParam];
      }
    });

    if (this.esNativo) {
      // No hay SDK que cargar en nativo: mostramos directamente el botón propio
      this.sdkListo = true;

      this.retornoSub = this.paypalNativeService.retorno$.subscribe((evento) => {
        this.manejarRetornoNativo(evento);
      });
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
      return; // en nativo no cargamos el SDK JS de PayPal
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
    this.routeSub?.unsubscribe();
    this.retornoSub?.unsubscribe();
  }

  private actualizarPlanDesdeUrl() {
    const planParam = this.route.snapshot.queryParamMap.get('plan') as PlanKey | null;
    if (planParam && this.planes[planParam]) {
      this.planKey = planParam;
      this.plan = this.planes[planParam];
    }
  }

  // =========================================================
  // 🌐 FLUJO WEB (SDK JS de PayPal, sin cambios)
  // =========================================================

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

  // =========================================================
  // 📱 FLUJO NATIVO (Android/iOS): navegador del sistema + deep link
  // =========================================================

  async pagarNativo() {
    if (this.pagandoNativo) {
      return;
    }
    this.pagandoNativo = true;

    const loading = await this.loadingCtrl.create({ message: 'Conectando con PayPal...' });
    await loading.present();

    try {
      const approveUrl = await this.paypalNativeService.crearOrden(
        this.planKey,
        this.precioCalculadoUSD,
        environment.paypalCurrency
      );
      await loading.dismiss();
      await Browser.open({ url: approveUrl });
    } catch (err) {
      console.error('[PagosPage] Error creando orden nativa:', err);
      await loading.dismiss();
      await this.mostrarError('No se pudo iniciar el pago con PayPal.');
    } finally {
      this.pagandoNativo = false;
    }
  }

  private async manejarRetornoNativo(evento: RetornoPaypal) {
    if (evento.status === 'cancel') {
      return; // el usuario canceló en PayPal, no hacemos nada
    }

    if (!evento.orderId) {
      await this.mostrarError('PayPal no devolvió un identificador de orden.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Confirmando tu pago...' });
    await loading.present();

    try {
      const captura = await this.paypalNativeService.capturarOrden(evento.orderId);
      await loading.dismiss();

      if (captura.status === 'COMPLETED') {
        await this.finalizarPago(captura.orderId);
      } else {
        await this.mostrarError('El pago no se completó.');
      }
    } catch (err) {
      console.error('[PagosPage] Error capturando orden nativa:', err);
      await loading.dismiss();
      await this.mostrarError('Ocurrió un problema confirmando el pago.');
    }
  }

  // =========================================================
  // ✅ COMÚN A AMBOS FLUJOS
  // =========================================================

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