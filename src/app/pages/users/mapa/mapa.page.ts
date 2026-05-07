import { AfterViewInit, Component, OnDestroy, inject } from '@angular/core';
import * as L from 'leaflet';
import { AlertController, ToastController } from '@ionic/angular';
import { TrackingService, EstadoTracking } from 'src/app/core/services/tracking.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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

  ngOnDestroy(): void {
    // ✅ Solo desuscribirse, NO detener el tracking
    this.trackingSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  goHome() {
    this.router.navigateByUrl('/tabs/home');
  }



}