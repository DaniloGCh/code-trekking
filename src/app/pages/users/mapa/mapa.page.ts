import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false
})
export class MapaPage implements AfterViewInit, OnDestroy {

  map!: L.Map;

  userMarker!: L.CircleMarker;
  accuracyCircle!: L.Circle;

  routeLine!: L.Polyline;
  routePoints: [number, number][] = [];

  watchId: number | null = null;

  currentLat = 0;
  currentLng = 0;

  followUser = true;

  trackingActive = false; // 🔥 NUEVO: control de tracking

  lastValidPoint: { lat: number; lng: number; time: number } | null = null;

  totalDistance = 0;

  async ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      this.restoreRoute(); // 🔥 recupera ruta si existe
    }, 300);
  }

  initMap() {

    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([-33.4489, -70.6693], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.routeLine = L.polyline([], {
      color: '#2563eb',
      weight: 5
    }).addTo(this.map);

    this.map.on('dragstart', () => {
      this.followUser = false;
    });

    setTimeout(() => this.map.invalidateSize(), 500);
  }

  // =========================
  // 🔘 BOTÓN START / STOP
  // =========================
  toggleTracking() {

    if (this.trackingActive) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  startTracking() {

    if (!navigator.geolocation) return;

    this.trackingActive = true;

    this.watchId = navigator.geolocation.watchPosition(

      (position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const now = Date.now();

        if (accuracy > 30) return;

        if (!this.lastValidPoint) {

          this.lastValidPoint = { lat, lng, time: now };
          this.addPoint(lat, lng, accuracy);
          this.saveRoute();
          return;
        }

        const dist = this.calcularDistancia(
          this.lastValidPoint.lat,
          this.lastValidPoint.lng,
          lat,
          lng
        );

        const timeDiff = (now - this.lastValidPoint.time) / 1000;

        if (
          dist < 5 ||
          dist > 80 ||
          timeDiff < 1
        ) return;

        this.totalDistance += dist;

        this.lastValidPoint = { lat, lng, time: now };

        this.addPoint(lat, lng, accuracy);

        this.saveRoute(); // 🔥 guarda ruta en cada punto

      },

      (error) => console.error('GPS error:', error),

      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 30000
      }
    );
  }

  stopTracking() {

    this.trackingActive = false;

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // =========================
  // ➕ AGREGAR PUNTO
  // =========================
  private addPoint(lat: number, lng: number, accuracy?: number) {

    this.currentLat = lat;
    this.currentLng = lng;

    this.routePoints.push([lat, lng]);
    this.routeLine.setLatLngs(this.routePoints);

    if (!this.userMarker) {

      this.userMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#2563eb',
        color: '#fff',
        weight: 3,
        fillOpacity: 1
      }).addTo(this.map);

      this.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy || 10,
        color: '#3b82f6',
        fillOpacity: 0.15
      }).addTo(this.map);

      this.map.setView([lat, lng], 16);

    } else {

      this.userMarker.setLatLng([lat, lng]);

      if (accuracy) {
        this.accuracyCircle.setLatLng([lat, lng]);
        this.accuracyCircle.setRadius(accuracy);
      }

      if (this.followUser) {
        this.map.setView([lat, lng], this.map.getZoom());
      }
    }
  }

  // =========================
  // 💾 PERSISTENCIA RUTA
  // =========================
  saveRoute() {
    localStorage.setItem('routePoints', JSON.stringify(this.routePoints));
  }

  restoreRoute() {

    const saved = localStorage.getItem('routePoints');

    if (!saved) return;

    this.routePoints = JSON.parse(saved);

    this.routeLine.setLatLngs(this.routePoints);
  }

  // =========================
  // 📏 DISTANCIA
  // =========================
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

  // =========================
  // 📏 KM UI
  // =========================
  get distanceKm(): number {
    return this.totalDistance / 1000;
  }

  // =========================
  // 📦 EXPORT GPX
  // =========================
  exportGPX() {

    if (this.routePoints.length === 0) return;

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="TrekkingApp">\n`;
    gpx += `<trk><name>Ruta Trekking</name><trkseg>\n`;

    this.routePoints.forEach((p) => {
      gpx += `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>\n`;
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

  centrarEnUsuario() {
    if (!this.currentLat || !this.currentLng) return;

    this.followUser = true;
    this.map.setView([this.currentLat, this.currentLng], 16);
  }

  ngOnDestroy(): void {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    if (this.map) this.map.remove();
  }
}