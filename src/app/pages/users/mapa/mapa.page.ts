import { AfterViewInit, Component, OnDestroy, inject } from '@angular/core';
import * as L from 'leaflet';
import { AlertController, ToastController } from '@ionic/angular';
import { TrackingService, EstadoTracking } from 'src/app/core/services/tracking.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false
})
export class MapaPage implements AfterViewInit, OnDestroy {

  // ✅ Agrega estas propiedades
  tipoMapaActual: 'calle' | 'satelital' | 'terreno' | 'topo' = 'calle';

  private capas: Record<string, L.TileLayer> = {};
  private capaActual!: L.TileLayer;

  private trackingService = inject(TrackingService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  // ✅ Nuevas propiedades
  modoRuta = false;
  puntosRuta: L.LatLng[] = [];
  rutaControl: any = null;
  marcadoresRuta: L.Marker[] = [];
  buscandoDestino = false;

  map!: L.Map;
  userMarker!: L.CircleMarker;
  accuracyCircle!: L.Circle;
  routeLine!: L.Polyline;

  mostrarTipos = false;
  followUser = true;
  private trackingSub?: Subscription;

  // ✅ Estado viene del servicio
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

    // ✅ Definir todas las capas disponibles
    this.capas = {
      calle: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }),
      satelital: L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20, attribution: '© Google'
      }),
      // terreno: L.tileLayer('https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png?api_key=TU-API-KEY', {
      //   maxZoom: 20,
      //   attribution: '© Stadia Maps © OpenStreetMap'
      // }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap'
      }),
    };

    // ✅ Agregar capa inicial
    this.capaActual = this.capas['calle'];
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

  // ✅ Cambiar tipo de mapa
  cambiarTipaMapa(tipo: 'calle' | 'satelital' | 'terreno' | 'topo') {
    if (this.tipoMapaActual === tipo) return;

    this.map.removeLayer(this.capaActual);
    this.capaActual = this.capas[tipo];
    this.capaActual.addTo(this.map);

    // ✅ Asegurarse que la ruta quede encima
    this.routeLine.bringToFront();

    this.tipoMapaActual = tipo;

  }

  // ✅ Suscribirse al estado del servicio
  private suscribirseAlEstado() {
    this.trackingSub = this.trackingService.estado$.subscribe(estado => {
      this.estado = estado;

      // Actualizar ruta en el mapa
      const latLngs = estado.puntos.map(p => [p.lat, p.lng] as [number, number]);
      this.routeLine?.setLatLngs(latLngs);

      // Actualizar marcador de posición
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
  }

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

  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // ✅ ACTIVAR/DESACTIVAR MODO RUTA
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

// ✅ CLICK EN EL MAPA PARA MARCAR PUNTOS
private onMapClick(e: L.LeafletMouseEvent) {
  if (this.puntosRuta.length >= 2) {
    this.showToast('Ya tienes origen y destino. Limpia la ruta para trazar una nueva.', 'warning');
    return;
  }

  const punto = e.latlng;
  this.puntosRuta.push(punto);

  // Crear marcador
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

// ✅ RUTA DESDE UBICACIÓN ACTUAL
async rutaDesdeUbicacion() {
  const pos = this.trackingService.estadoActual.posicionActual;

  if (!pos) {
    await this.showToast('No se detectó tu ubicación actual', 'warning');
    return;
  }

  // Limpiar puntos anteriores
  this.limpiarRutaTrazada();

  // Agregar origen como ubicación actual
  const origen = L.latLng(pos.lat, pos.lng);
  this.puntosRuta.push(origen);

  const icono = this.crearIconoMarcador('🟢', 'Tu ubicación');
  const marcador = L.marker(origen, { icon: icono }).addTo(this.map);
  this.marcadoresRuta.push(marcador);

  // Activar modo ruta para que el usuario toque el destino
  this.modoRuta = true;
  this.map.on('click', this.onMapClick.bind(this));
  await this.showToast('Toca el mapa para marcar tu destino', 'primary');
}

// ✅ TRAZAR RUTA CON OSRM
// ✅ TRAZAR RUTA CON OSRM
private trazarRuta(origen: L.LatLng, destino: L.LatLng) {

  // Limpiar ruta anterior
  if (this.rutaControl) {
    this.map.removeControl(this.rutaControl);
    this.rutaControl = null;
  }

  this.showToast('Calculando ruta...', 'primary');

  this.rutaControl = (L as any).Routing.control({

    waypoints: [origen, destino],

    router: (L as any).Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'foot',
    }),

    lineOptions: {
      styles: [{
        color: '#e74c3c',
        weight: 5,
        opacity: 0.8
      }],
      extendToWaypoints: true,
      missingRouteTolerance: 0
    },

    // ✅ IMPORTANTE
    show: false,

    addWaypoints: false,
    routeWhileDragging: false,
    fitSelectedRoutes: true,
    showAlternatives: false,

    createMarker: () => null,

  })

  .on('routesfound', async (e: any) => {

    const ruta = e.routes[0];

    const distancia = (
      ruta.summary.totalDistance / 1000
    ).toFixed(2);

    const tiempo = Math.round(
      ruta.summary.totalTime / 60
    );

    await this.showToast(
      `Ruta: ${distancia} km · ~${tiempo} min`,
      'success'
    );

    // ✅ MOVER PANEL DE LEAFLET AL ACORDEÓN
    setTimeout(() => {

      const instrucciones = document.querySelector(
        '.leaflet-routing-container'
      );

      const panel = document.getElementById('panel-ruta');

      if (instrucciones && panel) {

        panel.innerHTML = '';

        panel.appendChild(instrucciones);

      }

    }, 300);

  })

  .on('routingerror', async () => {

    await this.showToast(
      'No se encontró ruta entre los puntos seleccionados',
      'danger'
    );

    this.limpiarRutaTrazada();

  })

  .addTo(this.map);
}

// ✅ LIMPIAR RUTA TRAZADA
limpiarRutaTrazada() {
  // Eliminar control de ruta
  if (this.rutaControl) {
    this.map.removeControl(this.rutaControl);
    this.rutaControl = null;
  }

  // Eliminar marcadores
  this.marcadoresRuta.forEach(m => m.remove());
  this.marcadoresRuta = [];
  this.puntosRuta = [];

  // Desactivar modo ruta
  this.modoRuta = false;
  this.map.off('click');
}

// ✅ CREAR ICONO PERSONALIZADO
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

  ngOnDestroy(): void {
    // ✅ Solo desuscribirse, NO detener el tracking
    this.trackingSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  goHome() {
    this.router.navigateByUrl('/tabs/home');
  }



}