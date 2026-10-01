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
/**
 * Detecta si el error es un "Missing or insufficient permissions" de
 * Firestore/Firebase. Esto ocurre de forma esperada (no es un bug real)
 * cuando una escucha en vivo (collectionData/onSnapshot) sigue activa en
 * el instante exacto en que se cierra sesión: las reglas de seguridad
 * dejan de cumplirse antes de que el listener alcance a desuscribirse.
 * Estos errores se registran en consola pero no deben interrumpir ni
 * asustar al usuario con una pantalla de error, porque la app ya
 * navegó a donde correspondía (login / home).
 */
export function esErrorDePermisosPorSesionCerrada(error: any): boolean {
  const mensaje = String(error?.message ?? error ?? '').toLowerCase();
  const codigo = String(error?.code ?? '').toLowerCase();
  return codigo.includes('permission-denied')
    || mensaje.includes('missing or insufficient permissions');
}