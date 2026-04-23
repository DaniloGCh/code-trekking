// src/app/pages/home/home.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { UserData } from 'src/app/core/services/auth.service';
import { TimeService } from 'src/app/core/services/time.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  // 🔽 header scroll
  hideHeader = false;
  lastScrollTop = 0;

  // 👤 Datos del usuario actual
  userData: UserData | null = null;

  constructor(public weatherGlobal: WeatherGlobalService,public timeService: TimeService) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(async user => {
      if (user) {
        this.userData = await this.authService.getCurrentUserData();
        console.log('USER DATA:', this.userData);
      }
    });
  }

  // 🚪 CERRAR SESIÓN
  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
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

  // 👇 scroll header
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    if (scrollTop > this.lastScrollTop && scrollTop > 50) {
      this.hideHeader = true;
    } else {
      this.hideHeader = false;
    }

    this.lastScrollTop = scrollTop;
  }

  openWeatherLink() {
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
  }
}