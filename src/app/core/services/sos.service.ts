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

      // -----------------------------------------------------
      // 🔐 SOLICITAR PERMISOS
      // -----------------------------------------------------
      const permisos = await Geolocation.requestPermissions();

      if (permisos.location !== 'granted') {
        throw new Error('permiso-denegado');
      }

      // -----------------------------------------------------
      // 📍 OBTENER POSICIÓN ACTUAL
      // -----------------------------------------------------
      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      });

      // -----------------------------------------------------
      // 🔎 VALIDAR COORDENADAS
      // -----------------------------------------------------
      const lat = posicion.coords.latitude;
      const lon = posicion.coords.longitude;

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {
        throw new Error('ubicacion-no-disponible');
      }

      // -----------------------------------------------------
      // 📦 DEVOLVER UBICACIÓN
      // -----------------------------------------------------
      return {
        latitud: lat,
        longitud: lon,
        precision: posicion.coords.accuracy ?? 0,
        timestamp: new Date()
      };

    } catch (error: any) {

      console.error(
        '❌ Error obteniendo ubicación:',
        error
      );

      // -----------------------------------------------------
      // 🔐 PERMISO DENEGADO
      // -----------------------------------------------------
      if (
        error?.message === 'permiso-denegado' ||
        error?.code === 'OS-PLUG-GLOC-0003'
      ) {
        throw new Error('permiso-denegado');
      }

      // -----------------------------------------------------
      // ⏱️ TIEMPO EXCEDIDO
      // -----------------------------------------------------
      if (
        error?.code === 'OS-PLUG-GLOC-0010' ||
        error?.message?.toLowerCase()?.includes('timeout')
      ) {
        throw new Error('tiempo-excedido');
      }

      // -----------------------------------------------------
      // 📍 UBICACIÓN NO DISPONIBLE
      // -----------------------------------------------------
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

      // -----------------------------------------------------
      // 🔐 VERIFICAR PERMISOS
      // -----------------------------------------------------
      const permisos = await Geolocation.requestPermissions();

      if (permisos.location !== 'granted') {

        console.error(
          '❌ Permiso de ubicación denegado'
        );

        return null;
      }

      // -----------------------------------------------------
      // 📡 INICIAR WATCHER
      // -----------------------------------------------------
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 30000
        },
        (position, error) => {

          if (error) {

            console.error(
              '❌ Error en watcher GPS:',
              error
            );

            return;
          }

          if (!position) return;

          const lat =
            position.coords.latitude;

          const lon =
            position.coords.longitude;

          // -------------------------------------------------
          // 🔎 VALIDAR COORDENADAS
          // -------------------------------------------------
          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon)
          ) {

            console.warn(
              '⚠️ Coordenadas GPS inválidas'
            );

            return;
          }

          // -------------------------------------------------
          // 📦 CONSTRUIR UBICACIÓN
          // -------------------------------------------------
          const ubicacion: UbicacionSOS = {

            latitud: lat,

            longitud: lon,

            precision:
              position.coords.accuracy ?? 0,

            timestamp: new Date()

          };

          // -------------------------------------------------
          // 📤 ENTREGAR UBICACIÓN
          // -------------------------------------------------
          callback(ubicacion);

        }
      );

      return watchId;

    } catch (error) {

      console.error(
        '❌ Error iniciando seguimiento GPS:',
        error
      );

      return null;
    }
  }


  // =========================================================
  // 🛑 DETENER SEGUIMIENTO DE UBICACIÓN
  // =========================================================
  async detenerWatchUbicacion(
    watchId: string | null
  ): Promise<void> {

    if (!watchId) return;

    try {

      await Geolocation.clearWatch({
        id: watchId
      });

      console.log(
        '✅ Watcher GPS detenido'
      );

    } catch (error) {

      console.error(
        '❌ Error deteniendo watcher GPS:',
        error
      );

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

    const hora =
      ubicacion.timestamp.toLocaleTimeString(
        'es-CL',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      );

    const fecha =
      ubicacion.timestamp.toLocaleDateString(
        'es-CL'
      );

    const googleMapsUrl =
      `https://maps.google.com/?q=${ubicacion.latitud},${ubicacion.longitud}`;

    let mensaje =
      `🆘 ALERTA DE EMERGENCIA 🆘\n\n`;

    mensaje +=
      `👤 Persona: ${userData.nombre}\n`;

    if (eventoNombre) {

      mensaje +=
        `🏔️ Evento: ${eventoNombre}\n`;
    }

    mensaje +=
      `📅 Fecha: ${fecha}\n`;

    mensaje +=
      `⏰ Hora: ${hora}\n\n`;

    mensaje +=
      `📍 Ubicación GPS:\n`;

    mensaje +=
      `Lat: ${ubicacion.latitud.toFixed(6)}\n`;

    mensaje +=
      `Lon: ${ubicacion.longitud.toFixed(6)}\n`;

    mensaje +=
      `Precisión: ±${Math.round(ubicacion.precision)}m\n\n`;

    mensaje +=
      `🗺️ Ver en Google Maps:\n${googleMapsUrl}\n\n`;

    mensaje +=
      `⚠️ Por favor contactar de inmediato o llamar al 131 (Carabineros) o 132 (Bomberos)`;

    return mensaje;
  }


  // =========================================================
  // 📱 ENVIAR SOS POR SMS
  // =========================================================
  enviarSosPorSMS(
    telefonos: string,
    mensaje: string
  ) {

    const mensajeCodificado =
      encodeURIComponent(mensaje);

    const esAndroid =
      /android/i.test(
        navigator.userAgent
      );

    const separador =
      esAndroid ? ';' : ',';

    const telefonosFormateados =
      telefonos
        .split(',')
        .join(separador);

    window.open(
      `sms:${telefonosFormateados}?body=${mensajeCodificado}`,
      '_system'
    );
  }


  // =========================================================
  // 🟢 ENVIAR SOS POR WHATSAPP
  // =========================================================
  enviarSosPorWhatsApp(
    telefono: string,
    mensaje: string
  ) {

    const telefonoLimpio =
      telefono.replace(/\D/g, '');

    const mensajeCodificado =
      encodeURIComponent(mensaje);

    window.open(
      `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`,
      '_system'
    );
  }

}