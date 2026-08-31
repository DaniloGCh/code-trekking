// src/app/core/services/sos.service.ts

import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { UserData } from './auth.service';

export interface UbicacionSOS {
  latitud: number;
  longitud: number;
  precision: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SosService {

  // =========================================================
  // 📍 OBTENER UBICACIÓN ACTUAL
  // =========================================================

  async obtenerUbicacion(): Promise<UbicacionSOS> {

    try {

      // console.log('📍 Solicitando permisos de ubicación...');

      const permisos = await Geolocation.checkPermissions();
      let estado = permisos.location;

      if (estado !== 'granted') {
        const nuevosPermisos = await Geolocation.requestPermissions();
        estado = nuevosPermisos.location;
      }

      if (estado !== 'granted') {
        console.error('❌ Permiso de ubicación denegado');
        throw new Error('permiso-denegado');
      }

      // console.log('✅ Permiso de ubicación concedido');

      // =====================================================
      // 📍 OBTENER GPS
      // =====================================================

      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 10000
      });

      const lat = posicion.coords.latitude;
      const lon = posicion.coords.longitude;

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.error('❌ Coordenadas inválidas:', lat, lon);
        throw new Error('ubicacion-no-disponible');
      }

      // console.log('✅ GPS obtenido:', lat, lon);

      return {
        latitud: lat,
        longitud: lon,
        precision: posicion.coords.accuracy ?? 0,
        timestamp: new Date(posicion.timestamp)
      };

    } catch (error: any) {

      const code = error?.code;

      // 🔎 Log completo SIEMPRE, incluso en los casos ya
      // clasificados, para poder ver el código/mensaje real
      // de Capacitor en chrome://inspect o adb logcat.
      console.error(
        '❌ Error obteniendo ubicación → code:', code,
        '| message:', error?.message,
        '| error completo:', error
      );

      // =====================================================
      // 🔐 PERMISO DENEGADO
      // =====================================================

      if (
        code === 'OS-PLUG-GLOC-0003' ||
        error?.message === 'permiso-denegado'
      ) {
        throw new Error('permiso-denegado');
      }

      // =====================================================
      // 📍 SERVICIOS DE UBICACIÓN DESACTIVADOS
      // =====================================================

      if (
        code === 'OS-PLUG-GLOC-0007' ||
        code === 'OS-PLUG-GLOC-0009' ||
        code === 'OS-PLUG-GLOC-0017'
      ) {
        throw new Error('ubicacion-no-disponible');
      }

      // =====================================================
      // ⏱️ TIMEOUT
      // =====================================================

      if (code === 'OS-PLUG-GLOC-0010') {
        throw new Error('tiempo-excedido');
      }

      // =====================================================
      // ❌ ERROR GENERAL (no clasificado)
      // =====================================================
      //
      // Si el problema persiste, el "code" que se imprimió
      // arriba en el console.error es la pista real de qué
      // está pasando en el dispositivo — cópialo y podemos
      // agregar un caso específico para él.

      throw new Error('ubicacion-no-disponible');
    }
  }

  // =========================================================
  // 📡 SEGUIMIENTO DE UBICACIÓN
  // =========================================================

  async watchUbicacion(
    callback: (ubicacion: UbicacionSOS) => void
  ): Promise<string | null> {

    try {

      // console.log('📡 Iniciando watcher GPS...');

      const permisos = await Geolocation.checkPermissions();
      let estado = permisos.location;

      if (estado !== 'granted') {
        const nuevosPermisos = await Geolocation.requestPermissions();
        estado = nuevosPermisos.location;
      }

      if (estado !== 'granted') {
        console.error('❌ No hay permiso para seguimiento GPS');
        return null;
      }

      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 60000,
          maximumAge: 10000
        },
        (position, error) => {

          if (error) {
            console.warn('⚠️ Error temporal del watcher GPS:', error);
            // No lanzamos error. No borramos el clima.
            // Esperamos la siguiente posición.
            return;
          }

          if (!position) {
            console.warn('⚠️ Watcher no entregó posición');
            return;
          }

          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            console.warn('⚠️ Coordenadas inválidas');
            return;
          }

          const ubicacion: UbicacionSOS = {
            latitud: lat,
            longitud: lon,
            precision: position.coords.accuracy ?? 0,
            timestamp: new Date(position.timestamp)
          };

          // console.log('📍 Nueva ubicación GPS:', lat, lon);

          callback(ubicacion);
        }
      );

      // console.log('✅ Watcher GPS iniciado:', watchId);
      return watchId;

    } catch (error) {
      console.error('❌ Error iniciando watcher GPS:', error);
      return null;
    }
  }

  // =========================================================
  // 🛑 DETENER WATCHER
  // =========================================================

  async detenerWatchUbicacion(watchId: string | null): Promise<void> {

    if (!watchId) {
      return;
    }

    try {
      await Geolocation.clearWatch({ id: watchId });
      // console.log('✅ Watcher GPS detenido');
    } catch (error) {
      console.error('❌ Error deteniendo watcher GPS:', error);
    }
  }

  // =========================================================
  // 🆘 CONSTRUIR MENSAJE SOS
  // =========================================================

  construirMensajeSOS(
    userData: UserData,
    ubicacion: UbicacionSOS,
    eventoNombre?: string
  ): string {

    const hora = ubicacion.timestamp.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const fecha = ubicacion.timestamp.toLocaleDateString('es-CL');

    const googleMapsUrl =
      `https://maps.google.com/?q=${ubicacion.latitud},${ubicacion.longitud}`;

    let mensaje = `🆘 ALERTA DE EMERGENCIA 🆘\n\n`;
    mensaje += `👤 Persona: ${userData.nombre}\n`;

    if (eventoNombre) {
      mensaje += `🏔️ Evento: ${eventoNombre}\n`;
    }

    mensaje += `📅 Fecha: ${fecha}\n`;
    mensaje += `⏰ Hora: ${hora}\n\n`;
    mensaje += `📍 Ubicación GPS:\n`;
    mensaje += `Lat: ${ubicacion.latitud.toFixed(6)}\n`;
    mensaje += `Lon: ${ubicacion.longitud.toFixed(6)}\n`;
    mensaje += `Precisión: ±${Math.round(ubicacion.precision)}m\n\n`;
    mensaje += `🗺️ Ver en Google Maps:\n${googleMapsUrl}\n\n`;
    mensaje += `⚠️ Por favor contactar de inmediato o llamar al 131 (Carabineros) o 132 (Bomberos)`;

    return mensaje;
  }

  // =========================================================
  // 📱 SMS
  // =========================================================

  enviarSosPorSMS(telefonos: string, mensaje: string) {

    const mensajeCodificado = encodeURIComponent(mensaje);
    const esAndroid = /android/i.test(navigator.userAgent);
    const separador = esAndroid ? ';' : ',';
    const telefonosFormateados = telefonos.split(',').join(separador);

    window.open(
      `sms:${telefonosFormateados}?body=${mensajeCodificado}`,
      '_system'
    );
  }

  // =========================================================
  // 🟢 WHATSAPP
  // =========================================================

  enviarSosPorWhatsApp(telefono: string, mensaje: string) {

    const telefonoLimpio = telefono.replace(/\D/g, '');
    const mensajeCodificado = encodeURIComponent(mensaje);

    window.open(
      `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`,
      '_system'
    );
  }
}