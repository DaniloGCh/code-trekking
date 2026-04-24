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

  // 🔧 Inyección de servicios necesarios
  private authService = inject(AuthService); // Manejo de autenticación
  private router = inject(Router); // Navegación entre páginas
  private alertCtrl = inject(AlertController); // Alertas modales

  // 🔽 Control del header según scroll
  hideHeader = false; // Ocultar/mostrar header dinámicamente
  lastScrollTop = 0; // Guarda posición anterior del scroll

  // 👤 Datos del usuario autenticado
  userData: UserData | null = null;

  // 🌤️ Servicios públicos para clima y hora
  constructor(
    public weatherGlobal: WeatherGlobalService,
    public timeService: TimeService
  ) {}

  // 🚀 Se ejecuta al iniciar el componente
  ngOnInit() {
    // 🔐 Escucha cambios del usuario autenticado
    this.authService.currentUser$.subscribe(async user => {
      if (user) {
        // 📥 Obtiene datos completos del usuario desde Firestore
        this.userData = await this.authService.getCurrentUserData();
        console.log('USER DATA:', this.userData);
      }
    });
  }

  // 🚪 CERRAR SESIÓN
  async onLogout() {
    // 🧾 Confirmación antes de cerrar sesión
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
            // 🔓 Cierra sesión en Firebase Auth
            await this.authService.logout();

            // 🔁 Redirige al login
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  // 🏠 Ir al dashboard
  goDashboard() {
    this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }

  // 📜 Detecta scroll para ocultar/mostrar header
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    // 🔽 Si baja scroll, oculta header
    if (scrollTop > this.lastScrollTop && scrollTop > 50) {
      this.hideHeader = true;
    } else {
      // 🔼 Si sube scroll, muestra header
      this.hideHeader = false;
    }

    // 📌 Actualiza posición anterior
    this.lastScrollTop = scrollTop;
  }

  // 🌤️ Abre búsqueda de clima en Google
  openWeatherLink() {
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
  }

  // ➕ Navegar a crear evento
  goCrearEvento() {
    this.router.navigateByUrl('/tabs/crear-evento');
  }
}