import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { TimeService } from 'src/app/core/services/time.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {

  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  authReady = false;
  hideHeader = false;
  lastScrollTop = 0;

  userData: UserData | null = null;

  // ✅ FIX: declarar la suscripción correctamente
  private authSub?: Subscription;

  constructor(
    public weatherGlobal: WeatherGlobalService,
    public timeService: TimeService
  ) {}

  ngOnInit() {
    this.authSub = this.authService.currentUser$.subscribe(async user => {

      this.authReady = true;

      if (user) {
        this.userData = await this.authService.getCurrentUserData();
      } else {
        this.userData = null;
      }

    });
  }

  // ✅ limpiar memoria (IMPORTANTE)
  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

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
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

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

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }

  openWeatherLink() {
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
  }
}