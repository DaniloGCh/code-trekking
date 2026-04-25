import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { TimeService } from 'src/app/core/services/time.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';

import { ConsejoService } from 'src/app/core/services/consejo.service';
import { Consejo } from 'src/app/core/models/evento.model';


import { ModalController } from '@ionic/angular';
import { ManualSupervivenciaComponent } from 'src/app/components/manual-supervivencia/manual-supervivencia.component';


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

  // =========================
  // 📊 ESTADO DE AUTENTICACIÓN
  // =========================
  authReady = false;
  userData: UserData | null = null;

  private authSub?: Subscription;

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
    
  ) { }

  // =========================
  // 🚀 INIT
  // =========================
  ngOnInit() {
    this.consejoService.getConsejos().subscribe(data => {
      this.consejos = this.shuffleArray(data);
    });
    this.authSub = this.authService.currentUser$.subscribe(async user => {

      this.authReady = true;

      if (user) {
        this.userData = await this.authService.getCurrentUserData();
      } else {
        this.userData = null;
      }

    });
  }

async openManual() {
  const modal = await this.modalCtrl.create({
    component: ManualSupervivenciaComponent,
    cssClass: 'manual-modal'
  });

  await modal.present();
}

   // 🔀 AQUÍ VA LA FUNCIÓN (IMPORTANTE)
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

  // =========================
  // 🌤️ WEATHER ACTION
  // =========================
  openWeatherLink() {
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
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