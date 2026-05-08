import { AfterViewInit, Component, OnDestroy, inject } from '@angular/core';
import * as L from 'leaflet';
import { AlertController, ToastController } from '@ionic/angular';
import { TrackingService, EstadoTracking } from 'src/app/core/services/tracking.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false
})
export class MapaPage implements AfterViewInit, OnDestroy {

  private trackingService = inject(TrackingService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  // =========================
  // 🗺️ MAPA
  // =========================
  map!: L.Map;
  userMarker!: L.CircleMarker;
  accuracyCircle!: L.Circle;
  routeLine!: L.Polyline;
  followUser = true;
  mostrarTipos = false;
  tipoMapaActual: 'calle' | 'satelital' | 'terreno' | 'topo' = 'topo';
  private capas: Record<string, L.TileLayer> = {};
  private capaActual!: L.TileLayer;
  private trackingSub?: Subscription;

  // =========================
  // 📍 TRACKING
  // =========================
  estado: EstadoTracking = this.trackingService.estadoActual;

  get trackingActive() { return this.estado.activo; }
  get distanceKm() { return this.estado.distanciaTotal / 1000; }
  get tiempoSegundos() { return this.estado.tiempoSegundos; }
  get routePoints() { return this.estado.puntos; }

  get tiempoFormateado(): string {
    const horas = Math.floor(this.tiempoSegundos / 3600);
    const minutos = Math.floor((this.tiempoSegundos % 3600) / 60);
    const segundos = this.tiempoSegundos % 60;
    const hh = horas.toString().padStart(2, '0');
    const mm = minutos.toString().padStart(2, '0');
    const ss = segundos.toString().padStart(2, '0');
    return horas > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  get coordenadasFormateadas(): string {
    const pos = this.estado.posicionActual;
    if (!pos) return 'Sin señal GPS';
    return `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
  }

  // =========================
  // 🛣️ RUTAS
  // =========================
  modoRuta = false;
  puntosRuta: L.LatLng[] = [];
  rutaControl: any = null;
  marcadoresRuta: L.Marker[] = [];
  mostrarInstrucciones = false;       // ✅ Propiedad faltante
  perfilRuta: 'hike' | 'foot' | 'car' = 'hike'; // ✅ Propiedad faltante
  instrucciones: { instruccion: string; distancia: string }[] = [];

  // =========================
  // 🚀 INIT
  // =========================
  async ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      this.trackingService.iniciarWatcherPosicion();
      this.suscribirseAlEstado();
    }, 300);
  }

  initMap() {
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([-33.4489, -70.6693], 13);

    // ✅ Definir capas
    this.capas = {
      calle: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }),
      satelital: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri World Imagery'
      }),
      terreno: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri World Topo'
      }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap'
      }),
    };

    // ✅ Topo como capa inicial
    this.capaActual = this.capas['topo'];
    this.capaActual.addTo(this.map);

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
  // 🗺️ CAPAS
  // =========================
  cambiarTipaMapa(tipo: 'calle' | 'satelital' | 'terreno' | 'topo') {
    if (this.tipoMapaActual === tipo) return;
    this.map.removeLayer(this.capaActual);
    this.capaActual = this.capas[tipo];
    this.capaActual.addTo(this.map);
    this.routeLine.bringToFront();
    if (this.userMarker) this.userMarker.bringToFront();
    this.tipoMapaActual = tipo;
  }

  // =========================
  // 📡 SUSCRIPCIÓN TRACKING
  // =========================
private suscribirseAlEstado() {
  this.trackingSub = this.trackingService.estado$.subscribe(estado => {
    this.estado = estado;

    const latLngs = estado.puntos.map(p => [p.lat, p.lng] as [number, number]);
    this.routeLine?.setLatLngs(latLngs);

    if (estado.posicionActual) {
      const { lat, lng } = estado.posicionActual;

      if (!this.userMarker) {
        this.userMarker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: '#2563eb',
          color: '#fff',
          weight: 3,
          fillOpacity: 1
        }).addTo(this.map);

        this.accuracyCircle = L.circle([lat, lng], {
          radius: 10,
          color: '#3b82f6',
          fillOpacity: 0.15
        }).addTo(this.map);

        this.map.setView([lat, lng], 16);

      } else {
        this.userMarker.setLatLng([lat, lng]);
        this.accuracyCircle.setLatLng([lat, lng]);

        if (this.followUser) {
          this.map.setView([lat, lng], this.map.getZoom());
        }
      }
    }
  });

  // ✅ Restaurar ruta trazada si existe
  const rutaGuardada = this.trackingService.estadoRutaActual;
  if (rutaGuardada.activa && rutaGuardada.puntos.length > 0) {
    this.restaurarRutaTrazada(rutaGuardada);
  }
}

// ✅ Restaurar ruta en el mapa
private restaurarRutaTrazada(rutaGuardada: any) {
  // Restaurar polyline
  const latLngs = rutaGuardada.puntos.map(
    (p: any) => L.latLng(p.lat, p.lng)
  );

  this.rutaControl = L.polyline(latLngs, {
    color: '#e74c3c',
    weight: 5,
    opacity: 0.8
  }).addTo(this.map);

  // Restaurar instrucciones
  this.instrucciones = rutaGuardada.instrucciones;
  this.perfilRuta = rutaGuardada.perfilRuta;

  // Restaurar marcadores de origen y destino
  const emojis = ['🟢', '🔴'];
  rutaGuardada.puntosMarcados.forEach((p: any, i: number) => {
    const icono = this.crearIconoMarcador(emojis[i], '');
    const marcador = L.marker([p.lat, p.lng], { icon: icono }).addTo(this.map);
    this.marcadoresRuta.push(marcador);
    this.puntosRuta.push(L.latLng(p.lat, p.lng));
  });

  // Centrar mapa en la ruta
  this.map.fitBounds((this.rutaControl as any).getBounds(), { padding: [40, 40] });
}

  // =========================
  // ▶️ TRACKING ACTIONS
  // =========================
  toggleTracking() {
    if (this.trackingService.estadoActual.activo) {
      this.trackingService.detenerTracking();
    } else {
      this.trackingService.iniciarTracking();
    }
  }

  async onLimpiarRuta() {
    const alert = await this.alertCtrl.create({
      header: 'Limpiar ruta',
      message: '¿Estás seguro que deseas limpiar la ruta? Se perderán los datos actuales.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Limpiar',
          handler: () => {
            this.trackingService.limpiarRuta();
            this.showToast('Ruta limpiada correctamente.', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  exportGPX() {
    if (this.routePoints.length === 0) return;
    this.trackingService.exportarGPX();
  }

  centrarEnUsuario() {
    const pos = this.estado.posicionActual;
    if (!pos) return;
    this.followUser = true;
    this.map.setView([pos.lat, pos.lng], 16);
  }

  // =========================
  // 🛣️ RUTAS ORS
  // =========================
  toggleModoRuta() {
    this.modoRuta = !this.modoRuta;

    if (this.modoRuta) {
      this.map.on('click', this.onMapClick.bind(this));
      this.showToast('Toca el mapa para marcar origen y destino', 'primary');
    } else {
      this.map.off('click');
      this.limpiarRutaTrazada();
    }
  }

  private onMapClick(e: L.LeafletMouseEvent) {
    if (this.puntosRuta.length >= 2) {
      this.showToast('Ya tienes origen y destino. Limpia la ruta para trazar una nueva.', 'warning');
      return;
    }

    const punto = e.latlng;
    this.puntosRuta.push(punto);

    const icono = this.puntosRuta.length === 1
      ? this.crearIconoMarcador('🟢', 'Origen')
      : this.crearIconoMarcador('🔴', 'Destino');

    const marcador = L.marker(punto, { icon: icono }).addTo(this.map);
    this.marcadoresRuta.push(marcador);

    if (this.puntosRuta.length === 2) {
      this.trazarRuta(this.puntosRuta[0], this.puntosRuta[1]);
    } else {
      this.showToast('Ahora toca el destino en el mapa', 'primary');
    }
  }

  async rutaDesdeUbicacion() {
    const pos = this.trackingService.estadoActual.posicionActual;

    if (!pos) {
      await this.showToast('No se detectó tu ubicación actual', 'warning');
      return;
    }

    this.limpiarRutaTrazada();

    const origen = L.latLng(pos.lat, pos.lng);
    this.puntosRuta.push(origen);

    const icono = this.crearIconoMarcador('🟢', 'Tu ubicación');
    const marcador = L.marker(origen, { icon: icono }).addTo(this.map);
    this.marcadoresRuta.push(marcador);

    this.modoRuta = true;
    this.map.on('click', this.onMapClick.bind(this));
    await this.showToast('Toca el mapa para marcar tu destino', 'primary');
  }

  private async trazarRuta(origen: L.LatLng, destino: L.LatLng) {
    if (this.rutaControl) {
      this.map.removeLayer(this.rutaControl);
      this.rutaControl = null;
    }

    this.showToast('Calculando ruta...', 'primary');

    const perfilORS: Record<string, string> = {
      hike: 'foot-hiking',
      foot: 'foot-walking',
      car: 'driving-car'
    };

    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/${perfilORS[this.perfilRuta]}?` +
        `api_key=${environment.orsKey}` +
        `&start=${origen.lng},${origen.lat}` +
        `&end=${destino.lng},${destino.lat}`
      );

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        await this.showToast('No se encontró ruta entre los puntos', 'danger');
        this.limpiarRutaTrazada();
        return;
      }

      const feature = data.features[0];
      const coordenadas = feature.geometry.coordinates;
      const resumen = feature.properties.summary;

      const latLngs: L.LatLng[] = coordenadas.map(
        (c: number[]) => L.latLng(c[1], c[0])
      );

      this.rutaControl = L.polyline(latLngs, {
        color: '#e74c3c',
        weight: 5,
        opacity: 0.8
      }).addTo(this.map);

      this.map.fitBounds((this.rutaControl as any).getBounds(), { padding: [40, 40] });

      const pasos = feature.properties.segments[0].steps;
      this.instrucciones = pasos.map((paso: any) => ({
        instruccion: this.traducirInstruccion(paso.instruction),
        distancia: paso.distance < 1000
          ? `${Math.round(paso.distance)} m`
          : `${(paso.distance / 1000).toFixed(1)} km`
      }));

      const distancia = (resumen.distance / 1000).toFixed(2);
      const tiempo = Math.round(resumen.duration / 60);
      await this.showToast(`🥾 ${distancia} km · ~${tiempo} min`, 'success');

      // ✅ Guardar ruta en el servicio
this.trackingService.guardarRutaTrazada(
  latLngs.map(ll => ({ lat: ll.lat, lng: ll.lng })),
  this.instrucciones,
  this.perfilRuta,
  this.puntosRuta.map(p => ({ lat: p.lat, lng: p.lng }))
);

    } catch (error) {
      await this.showToast('Error al calcular la ruta', 'danger');
      this.limpiarRutaTrazada();
    }
  }

  private traducirInstruccion(instruccion: string): string {
    return instruccion
      .replace(/Head/g, 'Dirígete')
      .replace(/Turn right/g, 'Gira a la derecha')
      .replace(/Turn left/g, 'Gira a la izquierda')
      .replace(/Keep right/g, 'Continúa por la derecha')
      .replace(/Keep left/g, 'Continúa por la izquierda')
      .replace(/Continue/g, 'Continúa')
      .replace(/Arrive at/g, 'Has llegado a')
      .replace(/Arrive/g, 'Has llegado')
      .replace(/north/g, 'norte')
      .replace(/south/g, 'sur')
      .replace(/east/g, 'este')
      .replace(/west/g, 'oeste');
  }

  // ✅ Un solo método limpiarRutaTrazada
limpiarRutaTrazada() {
  if (this.rutaControl) {
    this.map.removeLayer(this.rutaControl);
    this.rutaControl = null;
  }

  this.marcadoresRuta.forEach(m => m.remove());
  this.marcadoresRuta = [];
  this.puntosRuta = [];
  this.instrucciones = [];
  this.mostrarInstrucciones = false;
  this.modoRuta = false;
  this.map.off('click');

  // ✅ Limpiar también en el servicio
  this.trackingService.limpiarRutaTrazada();
}

  toggleInstrucciones() {
    this.mostrarInstrucciones = !this.mostrarInstrucciones;
  }

  private crearIconoMarcador(emoji: string, titulo: string): L.DivIcon {
    return L.divIcon({
      html: `<div style="
        font-size: 24px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        cursor: pointer;">
        ${emoji}
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: ''
    });
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // =========================
  // 🧭 NAVEGACIÓN
  // =========================
  goHome() {
    this.router.navigateByUrl('/tabs/home');
  }

  // =========================
  // 🧹 DESTROY
  // =========================
  ngOnDestroy(): void {
    this.trackingSub?.unsubscribe();
    if (this.map) this.map.remove();
  }
}