// src/app/core/services/tracking.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { registerPlugin } from '@capacitor/core';

import {
  BackgroundGeolocationPlugin,
  CallbackError,
  Location
} from '@capacitor-community/background-geolocation';

import { Capacitor } from '@capacitor/core';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';


const BackgroundGeolocation =
  registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');


export interface PuntoRuta {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface EstadoTracking {
  activo: boolean;
  puntos: PuntoRuta[];
  distanciaTotal: number;
  tiempoSegundos: number;
  posicionActual: { lat: number; lng: number } | null;
}

export interface EstadoRutaTrazada {
  activa: boolean;
  puntos: { lat: number; lng: number }[];
  instrucciones: { instruccion: string; distancia: string }[];
  perfilRuta: string;
  puntosMarcados: { lat: number; lng: number }[];
}



@Injectable({
  providedIn: 'root'
})
export class TrackingService {

  // =========================
  // 📊 ESTADO
  // =========================
  private estado = new BehaviorSubject<EstadoTracking>({
    activo: false,
    puntos: [],
    distanciaTotal: 0,
    tiempoSegundos: 0,
    posicionActual: null,
  });

  estado$ = this.estado.asObservable();

  private estadoRuta: EstadoRutaTrazada = {
    activa: false,
    puntos: [],
    instrucciones: [],
    perfilRuta: 'hike',
    puntosMarcados: []
  };

  // =========================
  // ⚙️ INTERNOS
  // =========================
  private timerInterval: any = null;
  private lastValidPoint: { lat: number; lng: number; time: number } | null = null;
  private watchId: string | null = null; // ✅ Background geolocation watch ID
  private posicionWatchId: string | null = null; // ✅ Para watcher de posición

  // ✅ Detectar si estamos en dispositivo nativo o web
  private esNativo = Capacitor.isNativePlatform();

  // =========================
  // 📡 WATCHER POSICIÓN (siempre activo)
  // =========================
  async iniciarWatcherPosicion() {
    if (this.posicionWatchId !== null) return;

    if (this.esNativo) {
      // ✅ En dispositivo: usar BackgroundGeolocation
      this.posicionWatchId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Trekking App está usando tu ubicación',
          backgroundTitle: 'Ubicación activa',
          requestPermissions: true,
          stale: false,
          distanceFilter: 5, // ✅ Actualizar cada 5 metros
        },
        (location: Location | undefined, error: CallbackError | undefined) => {
          if (error || !location) return;

          this.estado.next({
            ...this.estadoActual,
            posicionActual: { lat: location.latitude, lng: location.longitude }
          });
        }
      ) //as unknown as string;

    } else {
      // ✅ En web/browser: usar navigator.geolocation
      const id = navigator.geolocation.watchPosition(
        (position) => {
          this.estado.next({
            ...this.estadoActual,
            posicionActual: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (error) => console.warn('Watcher posición error:', error.code),
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 60000
        }
      );
      this.posicionWatchId = id.toString();
    }
  }

  async detenerWatcherPosicion() {
    if (this.posicionWatchId === null) return;

    if (this.esNativo) {
      await BackgroundGeolocation.removeWatcher({ id: this.posicionWatchId });
    } else {
      navigator.geolocation.clearWatch(Number(this.posicionWatchId));
    }

    this.posicionWatchId = null;
  }

  // =========================
  // ▶️ INICIAR TRACKING
  // =========================
  private iniciandoTracking = false;

  async iniciarTracking() {
    if (this.iniciandoTracking || this.estadoActual.activo) return;

    this.iniciandoTracking = true;

    try {

      // ✅ Iniciar timer
      this.timerInterval = setInterval(() => {
        this.estado.next({
          ...this.estadoActual,
          tiempoSegundos: this.estadoActual.tiempoSegundos + 1
        });
      }, 1000);

      if (this.esNativo) {
        // ✅ En dispositivo: BackgroundGeolocation con optimización de batería
        this.watchId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Registrando tu ruta de trekking...',
            backgroundTitle: '🥾 Tracking activo',
            requestPermissions: true,
            stale: false,
            distanceFilter: 8, // ✅ Actualizar cada 8 metros para ahorrar batería
          },
          (location: Location | undefined, error: CallbackError | undefined) => {
            if (error || !location) return;

            const lat = location.latitude;
            const lng = location.longitude;
            const accuracy = location.accuracy || 999;
            const now = Date.now();

            // ✅ Filtro de precisión
            if (accuracy > 30) return;

            if (!this.lastValidPoint) {
              this.lastValidPoint = { lat, lng, time: now };

              this.agregarPunto(lat, lng);
              return;
            }

            const dist = this.calcularDistancia(
              this.lastValidPoint.lat, this.lastValidPoint.lng, lat, lng
            );

            const timeDiff = (now - this.lastValidPoint.time) / 1000;

            // ✅ Filtros anti-ruido
            if (dist < 5 || dist > 80 || timeDiff < 1) return;

            const nuevaDistancia = this.estadoActual.distanciaTotal + dist;
            this.lastValidPoint = { lat, lng, time: now };

            this.agregarPunto(lat, lng, nuevaDistancia);
          }
        ) //as unknown as string;

      } else {
        // ✅ En web/browser: navigator.geolocation
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            const now = Date.now();

            if (accuracy > 30) return;

            if (!this.lastValidPoint) {
              this.lastValidPoint = { lat, lng, time: now };
              this.agregarPunto(lat, lng);
              return;
            }

            const dist = this.calcularDistancia(
              this.lastValidPoint.lat, this.lastValidPoint.lng, lat, lng
            );
            const timeDiff = (now - this.lastValidPoint.time) / 1000;

            if (dist < 5 || dist > 80 || timeDiff < 1) return;

            const nuevaDistancia = this.estadoActual.distanciaTotal + dist;
            this.lastValidPoint = { lat, lng, time: now };
            this.agregarPunto(lat, lng, nuevaDistancia);
          },
          (error) => console.warn('GPS error:', error.code),
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 }
        );
        this.watchId = id.toString();
      }

      this.estado.next({ ...this.estadoActual, activo: true });

    } finally {

      this.iniciandoTracking = false;

    }

  }

  // =========================
  // ⏹ DETENER TRACKING
  // =========================
  async detenerTracking() {
    if (this.watchId !== null) {
      if (this.esNativo) {
        await BackgroundGeolocation.removeWatcher({ id: this.watchId });
      } else {
        navigator.geolocation.clearWatch(Number(this.watchId));
      }
      this.watchId = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.estado.next({ ...this.estadoActual, activo: false });
  }

  // =========================
  // 🗑️ LIMPIAR RUTA
  // =========================
  async limpiarRuta() {
    await this.detenerTracking();
    this.lastValidPoint = null;

    this.estado.next({
      activo: false,
      puntos: [],
      distanciaTotal: 0,
      tiempoSegundos: 0,
      posicionActual: this.estadoActual.posicionActual
    });
  }

  // =========================
  // 📦 EXPORTAR GPX
  // =========================
  async exportarGPX() {
    const puntos = this.estadoActual.puntos;

    if (puntos.length === 0) {
      throw new Error('No hay puntos de ruta para exportar');
    }

    // =========================
    // 📝 GENERAR GPX
    // =========================

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;

    gpx += `<gpx version="1.1" creator="TrekkingApp"
    xmlns="http://www.topografix.com/GPX/1/1"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.topografix.com/GPX/1/1
    http://www.topografix.com/GPX/1/1/gpx.xsd">\n`;

    gpx += `  <trk>\n`;
    gpx += `    <name>Ruta Trekking</name>\n`;
    gpx += `    <trkseg>\n`;

    puntos.forEach(p => {
      gpx += `      <trkpt lat="${p.lat}" lon="${p.lng}">\n`;
      gpx += `        <time>${new Date(p.timestamp).toISOString()}</time>\n`;
      gpx += `      </trkpt>\n`;
    });

    gpx += `    </trkseg>\n`;
    gpx += `  </trk>\n`;
    gpx += `</gpx>`;

    const nombreArchivo = `ruta-trekking-${Date.now()}.gpx`;

    // =========================
    // 🌐 WEB
    // =========================

    if (!Capacitor.isNativePlatform()) {

      const blob = new Blob(
        [gpx],
        { type: 'application/gpx+xml' }
      );

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = url;
      a.download = nombreArchivo;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      return;
    }

    // =========================
    // 📱 ANDROID / IOS
    // =========================

    // Convertir GPX a Base64 compatible con Capacitor
    const base64Data = this.stringToBase64(gpx);

    // Guardar temporalmente el archivo
    const archivo = await Filesystem.writeFile({
      path: nombreArchivo,
      data: base64Data,
      directory: Directory.Cache
    });

    console.log('📄 GPX creado:', archivo.uri);

    // Verificar si el dispositivo puede compartir
    const canShare = await Share.canShare();

    if (!canShare.value) {
      throw new Error('El dispositivo no permite compartir archivos');
    }

    // Abrir menú nativo de compartir
    await Share.share({
      title: 'Ruta de Trekking',
      text: 'Ruta GPX exportada desde Trekking App',
      url: archivo.uri,
      dialogTitle: 'Compartir o guardar ruta GPX'
    });
  }

  private stringToBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);

  let binary = '';

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

  // =========================
  // 🛣️ RUTA TRAZADA
  // =========================
  get estadoRutaActual(): EstadoRutaTrazada {
    return this.estadoRuta;
  }

  guardarRutaTrazada(
    puntos: { lat: number; lng: number }[],
    instrucciones: { instruccion: string; distancia: string }[],
    perfilRuta: string,
    puntosMarcados: { lat: number; lng: number }[]
  ) {
    this.estadoRuta = { activa: true, puntos, instrucciones, perfilRuta, puntosMarcados };
  }

  limpiarRutaTrazada() {
    this.estadoRuta = {
      activa: false, puntos: [], instrucciones: [], perfilRuta: 'hike', puntosMarcados: []
    };
  }

  // =========================
  // 🔧 HELPERS
  // =========================
  get estadoActual(): EstadoTracking {
    return this.estado.getValue();
  }

  private agregarPunto(lat: number, lng: number, nuevaDistancia?: number) {
    const nuevoPunto: PuntoRuta = { lat, lng, timestamp: Date.now() };
    this.estado.next({
      ...this.estadoActual,
      puntos: [...this.estadoActual.puntos, nuevoPunto],
      distanciaTotal: nuevaDistancia ?? this.estadoActual.distanciaTotal,
      posicionActual: { lat, lng }
    });
  }

  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}