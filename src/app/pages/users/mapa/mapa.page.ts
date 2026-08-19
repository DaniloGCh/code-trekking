import { AfterViewInit, Component, OnDestroy, inject } from '@angular/core';
import * as L from 'leaflet';
import { AlertController, ToastController } from '@ionic/angular';
import { TrackingService, EstadoTracking } from 'src/app/core/services/tracking.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Auth } from '@angular/fire/auth';

// ✅ Importa e inyecta SecurityService
import { SecurityService } from 'src/app/core/services/security.service';



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
  private auth = inject(Auth); // ✅ Para verificar sesión
  private security = inject(SecurityService);

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
    // ✅ Mostrar solo 4 decimales por privacidad (~11m de precisión)
    return `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
  }

  // =========================
  // 🛣️ RUTAS
  // =========================
  modoRuta = false;
  puntosRuta: L.LatLng[] = [];
  rutaControl: any = null;
  marcadoresRuta: L.Marker[] = [];
  mostrarInstrucciones = false;
  perfilRuta: 'hike' | 'foot' | 'car' = 'hike';
  instrucciones: { instruccion: string; distancia: string }[] = [];


  // ✅ Límite de puntos en ruta para evitar abuso de API
  private readonly MAX_PUNTOS_RUTA = 2;

  // =========================
  // 🚀 INIT
  // =========================
  async ngAfterViewInit() {
    if (!this.auth.currentUser) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    setTimeout(() => {
      this.initMap();
      this.trackingService.iniciarWatcherPosicion(); // ✅ Ya usa BackgroundGeolocation
      this.suscribirseAlEstado();
    }, 300);
  }

  initMap() {
    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([-33.4489, -70.6693], 13);

    this.capas = {
      calle: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }),
      satelital: L.layerGroup([
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, attribution: '© Esri' }
        ),
        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ),
        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        )
      ]) as any,
      terreno: L.tileLayer(
        `https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=${environment.thunderforestKey}`,
        { maxZoom: 22, attribution: '© Thunderforest Landscape' }
      ),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap'
      }),
    };

    this.capaActual = this.capas['calle'];
    this.capaActual.addTo(this.map);

    this.routeLine = L.polyline([], { color: '#2563eb', weight: 5 }).addTo(this.map);

    this.map.on('dragstart', () => { this.followUser = false; });

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

        // ✅ Validar coordenadas antes de usar
        if (!this.security.isValidCoordinates(lat, lng)) return;

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

    const rutaGuardada = this.trackingService.estadoRutaActual;
    if (rutaGuardada.activa && rutaGuardada.puntos.length > 0) {
      this.restaurarRutaTrazada(rutaGuardada);
    }
  }

  private restaurarRutaTrazada(rutaGuardada: any) {
    const latLngs = rutaGuardada.puntos.map((p: any) => L.latLng(p.lat, p.lng));

    const colorRuta = this.perfilRuta === 'car' ? '#2563eb'
      : this.perfilRuta === 'foot' ? '#f59e0b' : '#16a34a';

    this.rutaControl = L.polyline(latLngs, {
      color: colorRuta, weight: 6, opacity: 0.9, lineJoin: 'round'
    }).addTo(this.map);

    this.instrucciones = rutaGuardada.instrucciones;
    this.perfilRuta = rutaGuardada.perfilRuta;

    const emojis = ['🟢', '🔴'];
    rutaGuardada.puntosMarcados.forEach((p: any, i: number) => {
      const icono = this.crearIconoMarcador(emojis[i], '');
      const marcador = L.marker([p.lat, p.lng], { icon: icono }).addTo(this.map);
      this.marcadoresRuta.push(marcador);
      this.puntosRuta.push(L.latLng(p.lat, p.lng));
    });

    this.map.fitBounds((this.rutaControl as any).getBounds(), { padding: [40, 40] });
  }

  // =========================
  // ▶️ TRACKING ACTIONS
  // =========================
  async toggleTracking() {
    if (this.trackingService.estadoActual.activo) {
      await this.trackingService.detenerTracking();
    } else {
      await this.trackingService.iniciarTracking();
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

  // ✅ Exportar GPX con advertencia de privacidad
  async exportGPX() {
    if (this.routePoints.length === 0) {
      await this.showToast(
        'No hay puntos de ruta para exportar',
        'warning'
      );
      return;
    }

    const alert = await this.alertCtrl.create({
      header: '⚠️ Privacidad',

      message:
        'El archivo GPX contendrá tus coordenadas GPS exactas. ¿Deseas continuar?',

      buttons: [

        {
          text: 'Cancelar',
          role: 'cancel'
        },

        {
          text: 'Exportar',

          handler: async () => {

            try {

              await this.trackingService.exportarGPX();

              await this.showToast(
                'GPX generado correctamente',
                'success'
              );

            } catch (error) {

              console.error(
                '❌ Error exportando GPX:',
                error
              );

              await this.showToast(
                'No se pudo exportar la ruta',
                'danger'
              );

            }

          }
        }

      ]
    });

    await alert.present();
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
    if (this.puntosRuta.length >= this.MAX_PUNTOS_RUTA) {
      this.showToast('Ya tienes origen y destino. Limpia la ruta para trazar una nueva.', 'warning');
      return;
    }

    const punto = e.latlng;

    // ✅ Validar coordenadas del click
    if (!this.security.isValidCoordinates(punto.lat, punto.lng)) {
      this.showToast('Coordenadas inválidas', 'danger');
      return;
    }

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

    // ✅ Validar coordenadas antes de usar
    if (!this.security.isValidCoordinates(pos.lat, pos.lng)) {
      await this.showToast('Coordenadas GPS inválidas', 'danger');
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

    // ✅ Validar ambos puntos antes de llamar a la API
    if (!this.security.isValidCoordinates(origen.lat, origen.lng) ||
      !this.security.isValidCoordinates(destino.lat, destino.lng)) {
      await this.showToast('Coordenadas inválidas para trazar ruta', 'danger');
      this.limpiarRutaTrazada();
      return;
    }

    // ✅ Verificar que los puntos no sean el mismo
    if (origen.lat === destino.lat && origen.lng === destino.lng) {
      await this.showToast('El origen y destino no pueden ser el mismo punto', 'warning');
      this.limpiarRutaTrazada();
      return;
    }

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

    if (this.perfilRuta === 'car') {
      await this.showToast('🚗 La ruta vehicular depende de caminos habilitados', 'primary');
    }

    try {
      // ✅ Verificar que la API key existe
      if (!environment.orsKey) {
        await this.showToast('Servicio de rutas no disponible', 'danger');
        return;
      }

      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/${perfilORS[this.perfilRuta]}?` +
        `api_key=${environment.orsKey}` +
        `&start=${origen.lng},${origen.lat}` +
        `&end=${destino.lng},${destino.lat}`
      );

      // ✅ Verificar respuesta HTTP
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        if (this.perfilRuta === 'car') {
          await this.showToast('🚫 No hay acceso vehicular. Probando caminata...', 'warning');
          this.perfilRuta = 'foot';
          await this.trazarRuta(origen, destino);
          return;
        }
        await this.showToast('No se encontró ruta entre los puntos', 'danger');
        this.limpiarRutaTrazada();
        return;
      }

      const feature = data.features[0];
      const coordenadas = feature.geometry.coordinates;
      const resumen = feature.properties.summary;

      // ✅ Validar coordenadas de la respuesta
      const latLngs: L.LatLng[] = coordenadas
        .filter((c: number[]) => this.security.isValidCoordinates(c[1], c[0]))
        .map((c: number[]) => L.latLng(c[1], c[0]));

      if (latLngs.length === 0) {
        await this.showToast('La ruta recibida contiene datos inválidos', 'danger');
        return;
      }

      const colorRuta = this.perfilRuta === 'car' ? '#2563eb'
        : this.perfilRuta === 'foot' ? '#f59e0b'
          : '#16a34a';

      this.rutaControl = L.polyline(latLngs, {
        color: colorRuta,
        weight: this.perfilRuta === 'car' ? 7 : 6,
        opacity: 0.92,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: this.perfilRuta === 'hike' ? '10, 12' : undefined,
        smoothFactor: 1.5
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

      this.trackingService.guardarRutaTrazada(
        latLngs.map(ll => ({ lat: ll.lat, lng: ll.lng })),
        this.instrucciones,
        this.perfilRuta,
        this.puntosRuta.map(p => ({ lat: p.lat, lng: p.lng }))
      );

    } catch {
      await this.showToast('Error al calcular la ruta', 'danger');
      this.limpiarRutaTrazada();
    }
  }

  private traducirInstruccion(instruccion: string): string {
    let resultado = instruccion;

    const dirMap: Record<string, string> = {
      north: 'norte', south: 'sur', east: 'este', west: 'oeste'
    };

    resultado = resultado
      .replace(/(⬅️|➡️|↖️|↗️|🔁)\s*(a la izquierda|a la derecha)?/gi, '')
      .replace(/\s*,\s*$/g, '');

    resultado = resultado.replace(
      /(arrive|has llegado)(?: at)?(?: your destination| a)?\s*(.+?)(?:,.*)?$/gi,
      (_m, _verb, place) => `🏁 Has llegado a tu destino: ${place.trim()}`
    );

    resultado = resultado.replace(
      /head\s+(north|south|east|west)\s+(on|onto)\s+(.+)/gi,
      (_m, dir, _pre, street) => `➡️ Dirígete hacia el ${dirMap[dir]} por ${street}`
    );

    resultado = resultado
      .replace(/turn sharp right/gi, '🔁 Gira fuerte a la derecha')
      .replace(/turn sharp left/gi, '🔁 Gira fuerte a la izquierda')
      .replace(/turn right/gi, '➡️ Gira a la derecha')
      .replace(/turn left/gi, '⬅️ Gira a la izquierda')
      .replace(/slight right/gi, '↗️ Mantente a la derecha')
      .replace(/slight left/gi, '↖️ Mantente a la izquierda')
      .replace(/continue straight/gi, '⬆️ Continúa recto')
      .replace(/continue onto/gi, '➡️ Continúa hacia')
      .replace(/keep right/gi, '➡️ Mantente a la derecha')
      .replace(/keep left/gi, '⬅️ Mantente a la izquierda')
      .replace(/continue/gi, '➡️ Continúa')
      .replace(/onto/gi, 'hacia')
      .replace(/toward/gi, 'hacia')
      .replace(/on the left/gi, '⬅️ a la izquierda')
      .replace(/on the right/gi, '➡️ a la derecha')
      .replace(/at the roundabout/gi, '🔄 en la rotonda')
      .replace(/enter the roundabout/gi, '🔄 entra a la rotonda')
      .replace(/exit the roundabout/gi, '➡️ sal de la rotonda')
      .replace(/take exit (\d+)/gi, '➡️ toma la salida $1')
      .replace(/take the (\d+)(st|nd|rd|th) exit/gi, '➡️ toma la salida $1')
      .replace(/roundabout/gi, 'rotonda')
      .replace(/make a u-turn/gi, '🔁 haz un retorno')
      .replace(/u-turn/gi, '🔁 retorno')
      .replace(/north/gi, 'norte')
      .replace(/south/gi, 'sur')
      .replace(/east/gi, 'este')
      .replace(/west/gi, 'oeste');

    return resultado.replace(/\s+/g, ' ').trim();
  }

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

    this.trackingService.limpiarRutaTrazada();
  }

  toggleInstrucciones() {
    this.mostrarInstrucciones = !this.mostrarInstrucciones;
  }

  private crearIconoMarcador(emoji: string, titulo: string): L.DivIcon {
    return L.divIcon({
      html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));cursor:pointer;">${emoji}</div>`,
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
  // ✅ Actualiza ngOnDestroy para usar async
  async ngOnDestroy() {
    this.trackingSub?.unsubscribe();
    await this.trackingService.detenerWatcherPosicion(); // ✅ Limpia correctamente
    if (this.map) this.map.remove();
  }
}