import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

export type PlanKey = 'mensual' | 'trimestral' | 'anual';

export interface RetornoPaypal {
  status: 'success' | 'cancel';
  orderId?: string;
  planKey?: PlanKey;
}

@Injectable({ providedIn: 'root' })
export class PaypalNativeService {

  // ⚠️ SOLO SANDBOX. Nunca reemplaces esto por credenciales LIVE:
  // el secret quedaría expuesto dentro del APK/IPA.
  private readonly PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com';

  retorno$ = new Subject<RetornoPaypal>();

  private async obtenerAccessToken(): Promise<string> {
    const credenciales = btoa(`${environment.paypalClientId}:${environment.paypalClientSecretSandbox}`);

    const res = await fetch(`${this.PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credenciales}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!res.ok) {
      throw new Error('No se pudo autenticar con PayPal (sandbox)');
    }

    const data = await res.json();
    return data.access_token;
  }

  async crearOrden(planKey: PlanKey, monto: string, moneda: string): Promise<string> {
    const accessToken = await this.obtenerAccessToken();

    const res = await fetch(`${this.PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: planKey,
          amount: { currency_code: moneda, value: monto }
        }],
        application_context: {
          return_url: `codetrekking://payment-success?plan=${planKey}`,
          cancel_url: 'codetrekking://payment-cancel',
          user_action: 'PAY_NOW'
        }
      })
    });

    if (!res.ok) {
      throw new Error('PayPal rechazó la creación de la orden (revisa client id/secret de sandbox)');
    }

    const orden = await res.json();
    const approveUrl = orden.links?.find((l: any) => l.rel === 'approve')?.href;

    if (!approveUrl) {
      throw new Error('PayPal no devolvió un link de aprobación');
    }

    return approveUrl;
  }

  async capturarOrden(orderId: string): Promise<{ status: string; orderId: string }> {
    const accessToken = await this.obtenerAccessToken();

    const res = await fetch(`${this.PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error('No se pudo capturar el pago en PayPal (sandbox)');
    }

    const captura = await res.json();
    return { status: captura.status, orderId: captura.id };
  }

  notificarRetorno(evento: RetornoPaypal) {
    this.retorno$.next(evento);
  }
}