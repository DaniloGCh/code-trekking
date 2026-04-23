// src/app/pages/admin/dashboard/dashboard.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { Observable } from 'rxjs';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  // 🔽 header scroll
  hideHeader = false;
  lastScrollTop = 0;

  // 👤 Datos del admin actual
  adminData: UserData | null = null;

  // 👥 Lista de usuarios
  users$: Observable<UserData[]> = this.authService.getAllUsers();

  // 📊 Estadísticas
  totalUsers = 0;
  totalAdmins = 0;
  totalRegulares = 0;

  constructor(public weatherGlobal: WeatherGlobalService, public timeService: TimeService) { }

  async ngOnInit() {
    this.adminData = await this.authService.getCurrentUserData();

    // Calcular estadísticas
    this.users$.subscribe(users => {
      this.totalUsers = users.length;
      this.totalAdmins = users.filter(u => u.rol === 'admin').length;
      this.totalRegulares = users.filter(u => u.rol === 'user').length;
    });
  }

  // 🔄 CAMBIAR ROL DE USUARIO
  async onChangeRole(user: UserData) {
    const nuevoRol = user.rol === 'admin' ? 'user' : 'admin';
    const rolLabel = nuevoRol === 'admin' ? 'Administrador' : 'Usuario';

    const alert = await this.alertCtrl.create({
      header: 'Cambiar rol',
      message: `¿Cambiar el rol de ${user.nombre} a ${rolLabel}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async () => {
            try {
              await this.authService.updateUserRole(user.uid, nuevoRol);
              await this.showToast(`Rol de ${user.nombre} actualizado a ${rolLabel}`);
            } catch (error) {
              await this.showToast('Error al actualizar el rol', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // 🚪 CERRAR SESIÓN
  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          handler: async () => {
            await this.authService.logout();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  // 🍞 Toast helper
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goHome() {
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
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