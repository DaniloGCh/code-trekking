import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { TimeService } from 'src/app/core/services/time.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';

import { ConsejoService } from 'src/app/core/services/consejo.service';
import { Consejo } from 'src/app/core/models/evento.model';

import { ModalController } from '@ionic/angular';
import { ManualSupervivenciaComponent } from 'src/app/components/manual-supervivencia/manual-supervivencia.component';

import { KitPrimerosAuxiliosService } from 'src/app/core/services/kit-primeros-auxilios.service';
import { KitSupervivenciaService } from 'src/app/core/services/kit-supervivencia.service';
import { KitPrimerosAuxilios, KitSupervivencia, Evento } from 'src/app/core/models/evento.model';
import { Observable } from 'rxjs';

import { SosService } from 'src/app/core/services/sos.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { Auth } from '@angular/fire/auth';

import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { WeatherService } from 'src/app/core/services/weather.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {

  consejos: Consejo[] = [];

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private kitPAService = inject(KitPrimerosAuxiliosService);
  private kitSupService = inject(KitSupervivenciaService);
  private sosService = inject(SosService);
  private eventoService = inject(EventoService);
  private auth = inject(Auth);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // =========================
  // 📊 ESTADO
  // =========================
  authReady = false;
  userData: UserData | null = null;
  misEventos: Evento[] = [];
  sosActivo = false;

  private authSub?: Subscription;
  private eventosSub?: Subscription; // ✅ Para desuscribirse

  // =========================
  // 🎨 UI STATE
  // =========================
  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 🌦️ SERVICIOS UI
  // =========================
  constructor(
    public weatherGlobal: WeatherGlobalService,
    public timeService: TimeService,
    private consejoService: ConsejoService,
    private modalCtrl: ModalController,
    private http: HttpClient,
    private weatherService: WeatherService
  ) { }

  kitsPA$: Observable<KitPrimerosAuxilios[]> = this.kitPAService.getKits();
  kitsSup$: Observable<KitSupervivencia[]> = this.kitSupService.getKits();

  temperature$ = this.weatherGlobal.temperature;
  description$ = this.weatherGlobal.description;
  locationName$ = this.weatherGlobal.locationName;
  icon$ = this.weatherGlobal.icon;
  humidity$ = this.weatherGlobal.humidity;
  windSpeed$ = this.weatherGlobal.windSpeed;

  // =========================
  // 🚀 INIT
  // =========================
  ngOnInit() {
    this.weatherGlobal.startLocationTracking();
    this.consejoService.getConsejos().subscribe(data => {
      this.consejos = this.shuffleArray(data);
    });

    this.authSub = this.authService.currentUser$.subscribe(async user => {
      this.authReady = true;

      if (user) {
        this.userData = await this.authService.getCurrentUserData();

        // ✅ Cargar eventos del usuario
        this.eventosSub = this.eventoService.getMisEventos().subscribe(eventos => {
          this.misEventos = eventos;
        });

      } else {
        this.userData = null;
        this.misEventos = [];
      }
    });
  }

  // =========================
  // 🆘 SOS
  // =========================
  async onSOS() {
    // Verificar que tiene contactos de emergencia
    if (!this.userData?.contactosEmergencia?.length) {
      const alert = await this.alertCtrl.create({
        header: '⚠️ Sin contactos',
        message: 'No tienes contactos de emergencia registrados. Ve a Configuración para agregarlos.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Ir a configuración',
            handler: () => this.router.navigateByUrl('/settings')
          }
        ]
      });
      await alert.present();
      return;
    }

    // Confirmación antes de enviar
    const confirm = await this.alertCtrl.create({
      header: '🆘 ENVIAR ALERTA SOS',
      message: `Se enviará tu ubicación GPS a ${this.userData.contactosEmergencia.length} contacto(s) de emergencia. ¿Confirmas?`,
      cssClass: 'sos-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: '🆘 ENVIAR AHORA',
          cssClass: 'sos-confirm-btn',
          handler: () => this.ejecutarSOS()
        }
      ]
    });

    await confirm.present();
  }

  private async ejecutarSOS() {
    this.sosActivo = true;

    const loading = await this.loadingCtrl.create({
      message: '📡 Obteniendo ubicación GPS...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Obtener ubicación
      const ubicacion = await this.sosService.obtenerUbicacion();
      await loading.dismiss();

      // Obtener evento activo si existe
      const eventoActivo = this.misEventos.length > 0 ? this.misEventos[0] : null;

      // Construir mensaje
      const mensaje = this.sosService.construirMensajeSOS(
        this.userData!,
        ubicacion,
        eventoActivo?.nombre
      );

      // Mostrar opciones de envío
      await this.mostrarOpcionesEnvio(mensaje);

    } catch (error: any) {
      await loading.dismiss();
      this.sosActivo = false;

      const msg = error.message === 'permiso-denegado'
        ? 'Necesitas activar el GPS para enviar tu ubicación'
        : 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado';

      await this.showToast(msg, 'danger');
    }
  }

  private async mostrarOpcionesEnvio(mensaje: string) {
    const contactos = this.userData?.contactosEmergencia || [];

    const alert = await this.alertCtrl.create({
      header: '📤 Enviar alerta',
      message: `Selecciona cómo enviar la alerta a ${contactos.length} contacto(s)`,
      buttons: [
        {
          text: '💬 SMS (recomendado)',
          handler: () => this.enviarATodos(mensaje, 'sms')
        },
        {
          text: '📱 WhatsApp',
          handler: () => this.enviarATodos(mensaje, 'whatsapp')
        },
        {
          text: '📲 Ambos',
          handler: () => this.enviarATodos(mensaje, 'ambos')
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => { this.sosActivo = false; }
        }
      ]
    });

    await alert.present();
  }

  private async enviarATodos(mensaje: string, medio: 'sms' | 'whatsapp' | 'ambos') {
    const contactos = this.userData?.contactosEmergencia || [];
    let enviados = 0;

    if (medio === 'sms' || medio === 'ambos') {
      const telefonos = contactos.map(c => c.telefono).join(',');
      this.sosService.enviarSosPorSMS(telefonos, mensaje);
      enviados = contactos.length;
      await new Promise(r => setTimeout(r, 2000));
    }

    if (medio === 'whatsapp' || medio === 'ambos') {
      for (const contacto of contactos) {
        const confirm = await this.alertCtrl.create({
          header: `📱 WhatsApp`,
          message: `Enviando a ${contacto.nombre}`,
          buttons: [
            {
              text: 'Enviar',
              handler: () => {
                this.sosService.enviarSosPorWhatsApp(contacto.telefono, mensaje);
                enviados++; // ✅ Solo cuenta si presionó Enviar
              }
            },
            { text: 'Saltar', role: 'cancel' } // ✅ No incrementa enviados
          ]
        });
        await confirm.present();
        await confirm.onDidDismiss();
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    this.sosActivo = false;

    // ✅ Mensaje según lo que realmente se envió
    if (enviados === 0) {
      await this.showToast('No se envió ninguna alerta', 'warning');
    } else {
      await this.showToast(`✅ Alerta enviada a ${enviados} contacto(s)`, 'success');
    }
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // =========================
  // 🖼️ MODAL MANUAL
  // =========================
  async openManual() {
    const modal = await this.modalCtrl.create({
      component: ManualSupervivenciaComponent,
      cssClass: 'manual-modal'
    });
    await modal.present();
  }

  // =========================
  // 🔀 SHUFFLE
  // =========================
  shuffleArray(array: any[]) {
    return array
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  // =========================
  // 🧹 DESTROY
  // =========================
  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.eventosSub?.unsubscribe(); // ✅ Limpiar suscripción de eventos
    this.weatherGlobal.stopLocationTracking();
  }

  // =========================
  // 🚪 AUTH ACTIONS
  // =========================
  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'confirm',
          handler: async () => {
            await this.authService.logout();
            this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
          }
        }
      ]
    });
    await alert.present();
  }

  // =========================
  // 🧭 NAVIGATION
  // =========================
  goDashboard() {
    this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }

  goCrearEvento() {
    this.router.navigateByUrl('/tabs/crear-evento');
  }

  goLogin() {
    this.router.navigateByUrl('/login');
  }

  goRegister() {
    this.router.navigateByUrl('/register');
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  // =========================
  // 🌤️ WEATHER ACTION
  // =========================
  async openWeatherLink() {
    try {
      const ubicacion = await this.sosService.obtenerUbicacion();

      const url = `https://www.google.com/search?q=clima&near=${ubicacion.latitud},${ubicacion.longitud}`;

      window.open(url, '_blank');

    } catch (error) {
      console.error('Error obteniendo ubicación', error);

      // fallback si falla el GPS
      window.open('https://www.google.com/search?q=clima', '_blank');
    }
  }

  // =========================
  // 📜 SCROLL UI
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }


}