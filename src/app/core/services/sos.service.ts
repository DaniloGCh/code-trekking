// src/app/core/services/sos.service.ts

import { Injectable, inject } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { AuthService, UserData, ContactoEmergencia } from './auth.service';
import { EventoService } from './evento.service';

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

  private authService = inject(AuthService);
  private eventoService = inject(EventoService);

  // // ✅ OBTENER UBICACIÓN ACTUAL
  // async obtenerUbicacion(): Promise<UbicacionSOS> {
  //   const permiso = await Geolocation.requestPermissions();

  //   if (permiso.location !== 'granted') {
  //     throw new Error('permiso-denegado');
  //   }

  //   const posicion = await Geolocation.getCurrentPosition({
  //     enableHighAccuracy: true,
  //     timeout: 10000,
  //   });

  //   return {
  //     latitud: posicion.coords.latitude,
  //     longitud: posicion.coords.longitude,
  //     precision: posicion.coords.accuracy,
  //     timestamp: new Date(),
  //   };
  // }

  async obtenerUbicacion(): Promise<UbicacionSOS> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS no disponible en este dispositivo'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (posicion) => {
          resolve({
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
            precision: posicion.coords.accuracy,
            timestamp: new Date(),
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('permiso-denegado'));
          } else {
            reject(new Error('No se pudo obtener ubicación'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      );
    });
  }

  // ✅ CONSTRUIR MENSAJE SOS
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
    const googleMapsUrl = `https://maps.google.com/?q=${ubicacion.latitud},${ubicacion.longitud}`;

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

  // ✅ ENVIAR SOS POR SMS
  // ✅ Soporta múltiples destinatarios separados por coma
  enviarSosPorSMS(telefonos: string, mensaje: string) {
    const mensajeCodificado = encodeURIComponent(mensaje);

    // Android usa ; como separador, iOS usa ,
    const esAndroid = /android/i.test(navigator.userAgent);
    const separador = esAndroid ? ';' : ',';

    // Si vienen separados por coma, convertir según el OS
    const telefonosFormateados = telefonos.split(',').join(separador);

    window.open(`sms:${telefonosFormateados}?body=${mensajeCodificado}`, '_system');
  }

  // ✅ ENVIAR SOS POR WHATSAPP
  enviarSosPorWhatsApp(telefono: string, mensaje: string) {
    // Limpiar el teléfono (solo números)
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const mensajeCodificado = encodeURIComponent(mensaje);
    window.open(`https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`, '_system');
  }
}