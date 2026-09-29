// src/app/core/utils/error-utils.ts

/**
 * Genera un código corto para que la persona lo pueda reportar a soporte,
 * sin necesidad de mostrar el mensaje técnico ni el stack trace del error.
 * Ej: "ERR-M3F2A1B9".
 */
export function generarCodigoError(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Detecta si el error corresponde a una falla de carga de un chunk/módulo
 * de Angular (típico cuando se publica una nueva versión de la app mientras
 * la persona la tenía abierta con los archivos antiguos ya cacheados en el
 * navegador o en el WebView).
 */
export function esErrorDeCarga(error: any): boolean {
  const mensaje = String(error?.message ?? error ?? '').toLowerCase();
  return mensaje.includes('chunkloaderror')
    || mensaje.includes('loading chunk')
    || mensaje.includes('failed to fetch dynamically imported module')
    || mensaje.includes('importmodule')
    || mensaje.includes('load failed');
}
