// src/app/core/services/tracking.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

@Injectable({
  providedIn: 'root' // ✅ Singleton, vive toda la app
})
export class TrackingService {

  private watchId: number | null = null;
  private posicionWatchId: number | null = null;
  private timerInterval: any = null;
  private lastValidPoint: { lat: number; lng: number; time: number } | null = null;

  // ✅ BehaviorSubject para que el mapa se suscriba y reciba updates
  private estado = new BehaviorSubject<EstadoTracking>({
    activo: false,
    puntos: [],
    distanciaTotal: 0,
    tiempoSegundos: 0,
    posicionActual: null,
  });

  estado$ = this.estado.asObservable();

  // ✅ Getter del estado actual
  get estadoActual(): EstadoTracking {
    return this.estado.getValue();
  }

  // =========================
  // 📍 WATCHER POSICIÓN (siempre activo)
  // =========================
iniciarWatcherPosicion() {
  if (this.posicionWatchId !== null) return;

  this.posicionWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      this.estado.next({
        ...this.estadoActual,
        posicionActual: { lat, lng }
      });
    },
    (error) => {
      // ✅ Manejo específico por tipo de error
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          console.warn('GPS: Permiso denegado');
          break;
        case 2: // POSITION_UNAVAILABLE
          console.warn('GPS: Posición no disponible');
          break;
        case 3: // TIMEOUT
          // ✅ Timeout es normal, simplemente ignorarlo y seguir intentando
          console.warn('GPS: Timeout, reintentando...');
          break;
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,  // ✅ Acepta posición cacheada de hasta 10 segundos
      timeout: 60000,     // ✅ Aumentar timeout a 60 segundos
    }
  );
}

  detenerWatcherPosicion() {
    if (this.posicionWatchId !== null) {
      navigator.geolocation.clearWatch(this.posicionWatchId);
      this.posicionWatchId = null;
    }
  }

  // =========================
  // ▶️ INICIAR TRACKING
  // =========================
  iniciarTracking() {
    if (!navigator.geolocation || this.estadoActual.activo) return;

    // Iniciar timer
    this.timerInterval = setInterval(() => {
      this.estado.next({
        ...this.estadoActual,
        tiempoSegundos: this.estadoActual.tiempoSegundos + 1
      });
    }, 1000);

    this.watchId = navigator.geolocation.watchPosition(
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
          this.lastValidPoint.lat,
          this.lastValidPoint.lng,
          lat, lng
        );

        const timeDiff = (now - this.lastValidPoint.time) / 1000;

        if (dist < 5 || dist > 80 || timeDiff < 1) return;

        const nuevaDistancia = this.estadoActual.distanciaTotal + dist;
        this.lastValidPoint = { lat, lng, time: now };
        this.agregarPunto(lat, lng, nuevaDistancia);
      },
      (error) => console.error('GPS error:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 30000
      }
    );

    this.estado.next({
      ...this.estadoActual,
      activo: true
    });
  }

  // =========================
  // ⏹ DETENER TRACKING
  // =========================
  detenerTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.estado.next({
      ...this.estadoActual,
      activo: false
    });
  }

  // =========================
  // 🗑️ LIMPIAR RUTA
  // =========================
  limpiarRuta() {
    this.detenerTracking();
    this.lastValidPoint = null;

    this.estado.next({
      activo: false,
      puntos: [],
      distanciaTotal: 0,
      tiempoSegundos: 0,
      posicionActual: this.estadoActual.posicionActual // ✅ Mantiene posición
    });
  }

  // =========================
  // 📦 EXPORT GPX
  // =========================
  exportarGPX() {
    const puntos = this.estadoActual.puntos;
    if (puntos.length === 0) return;

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="TrekkingApp">\n`;
    gpx += `<trk><name>Ruta Trekking</name><trkseg>\n`;

    puntos.forEach((p) => {
      gpx += `<trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>\n`;
    });

    gpx += `</trkseg></trk>\n</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ruta-trekking-${Date.now()}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =========================
  // 🔧 HELPERS
  // =========================
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
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}