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
  routePoints: any[] = [];

  watchId: number | null = null;

  currentLat = 0;
  currentLng = 0;

  totalDistance = 0;
  speedKmh = 0;

  lastAltitude: number | null = null;
  elevationGain = 0;

  lastPosition: { lat: number; lng: number; time: number } | null = null;

  // 🧭 CONTROL DE AUTO-FOLLOW
  followUser = false;

  async ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      this.startTracking();
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

    // 🧠 detectar si el usuario mueve el mapa manualmente
    this.map.on('dragstart', () => {
      this.followUser = false;
    });

    setTimeout(() => this.map.invalidateSize(), 500);
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

  startTracking() {

    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(

      (position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const altitude = position.coords.altitude || 0;
        const now = Date.now();

        if (accuracy > 50) return;

        this.currentLat = lat;
        this.currentLng = lng;

        // 🛤️ ruta
        this.routePoints.push([lat, lng]);
        this.routeLine.setLatLngs(this.routePoints);

        // 📏 distancia + velocidad
        if (this.lastPosition) {

          const dist = this.calcularDistancia(
            this.lastPosition.lat,
            this.lastPosition.lng,
            lat,
            lng
          );

          const timeDiff = (now - this.lastPosition.time) / 1000;

          if (dist > 5 && timeDiff > 1) {
            this.totalDistance += dist;

            const speedMs = dist / timeDiff;
            this.speedKmh = Math.round(speedMs * 3.6);
          }
        }

        this.lastPosition = { lat, lng, time: now };

        // ⛰️ elevación
        if (altitude && this.lastAltitude !== null) {
          const diff = altitude - this.lastAltitude;

          if (diff > 0 && diff < 50) {
            this.elevationGain += diff;
          }
        }

        this.lastAltitude = altitude;

        // 🔵 marcador usuario
        if (!this.userMarker) {

          this.userMarker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: '#2563eb',
            color: '#fff',
            weight: 3,
            fillOpacity: 1
          }).addTo(this.map);

          this.accuracyCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: '#3b82f6',
            fillOpacity: 0.15
          }).addTo(this.map);

          this.map.setView([lat, lng], 16);
          this.followUser = true;

        } else {

          this.userMarker.setLatLng([lat, lng]);
          this.accuracyCircle.setLatLng([lat, lng]);
          this.accuracyCircle.setRadius(accuracy);

          // 👇 solo sigue al usuario si está en modo follow
          if (this.followUser) {
            this.map.setView([lat, lng], this.map.getZoom());
          }
        }

      },

      (error) => console.error(error),

      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 30000
      }

    );
  }

  // 🧭 BOTÓN: centrar en usuario
  centrarEnUsuario() {
    if (!this.currentLat || !this.currentLng) return;

    this.followUser = true;

    this.map.setView([this.currentLat, this.currentLng], 16);
  }

  exportGPX() {

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="TrekkingApp">\n<trk><name>Ruta Trekking</name><trkseg>\n`;

    this.routePoints.forEach((p: any) => {
      gpx += `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>\n`;
    });

    gpx += `</trkseg></trk></gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'ruta-trekking.gpx';
    a.click();

    URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    if (this.map) this.map.remove();
  }
}