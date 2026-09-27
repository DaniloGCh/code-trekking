// src/app/core/services/tipo-cambio.service.ts
import { Injectable } from '@angular/core';

/**
 * Obtiene el tipo de cambio CLP → USD desde una API pública y gratuita
 * (open.er-api.com — sin API key, sin tarjeta, actualiza 1 vez al día).
 *
 * Si la API falla o no responde a tiempo, se usa una tasa de respaldo
 * fija (this.TASA_RESPALDO) para que el checkout nunca quede bloqueado
 * por la caída de un servicio externo gratuito.
 *
 * El resultado se cachea en memoria por CACHE_MS para no golpear la API
 * en cada render de la página de pago.
 */
@Injectable({
  providedIn: 'root'
})
export class TipoCambioService {

  private readonly URL = 'https://open.er-api.com/v6/latest/USD';
  private readonly TIMEOUT_MS = 5000;
  private readonly CACHE_MS = 10 * 60 * 1000; // 10 minutos

  /** Tasa de respaldo (CLP por 1 USD) si la API externa no responde. */
  readonly TASA_RESPALDO = 950;

  private cache: { tasa: number; timestamp: number } | null = null;
  private pendiente: Promise<number> | null = null;

  /** Devuelve cuántos CLP equivalen a 1 USD hoy (con caché y respaldo). */
  async obtenerTasaClpPorUsd(): Promise<number> {
    if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_MS) {
      return this.cache.tasa;
    }

    // Evita disparar múltiples fetch en paralelo si se llama varias veces seguidas
    if (this.pendiente) {
      return this.pendiente;
    }

    this.pendiente = this.fetchTasa().finally(() => {
      this.pendiente = null;
    });

    return this.pendiente;
  }

  private async fetchTasa(): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const resp = await fetch(this.URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`Respuesta HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const tasa = data?.rates?.CLP;

      if (typeof tasa !== 'number' || !isFinite(tasa) || tasa <= 0) {
        throw new Error('Formato de respuesta inesperado (sin rates.CLP)');
      }

      this.cache = { tasa, timestamp: Date.now() };
      return tasa;

    } catch (err) {
      console.warn('[TipoCambioService] Usando tasa de respaldo por error en la API:', err);
      // No cacheamos el respaldo: en la próxima llamada se reintenta la API real.
      return this.TASA_RESPALDO;
    }
  }
}
