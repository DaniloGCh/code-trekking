// src/app/pages/admin/dashboard/dashboard.page.ts

// 🔹 Importaciones principales de Angular
import { Component, OnInit, inject } from '@angular/core';

// 🔹 Router para navegación entre páginas
import { Router } from '@angular/router';

// 🔹 Controladores de Ionic para alertas y notificaciones
import { AlertController, ToastController } from '@ionic/angular';

// 🔹 Servicio de autenticación y modelo de usuario
import { AuthService, UserData } from 'src/app/core/services/auth.service';

// 🔹 Observable para manejar datos reactivos
import { Observable } from 'rxjs';

// 🔹 Servicios personalizados (clima y hora)
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

@Component({
  selector: 'app-dashboard', // Nombre del componente
  templateUrl: './dashboard.page.html', // HTML asociado
  styleUrls: ['./dashboard.page.scss'], // Estilos
  standalone: false,
})
export class DashboardPage implements OnInit {

  // 🔹 Inyección de servicios
  private authService = inject(AuthService);       // Manejo de usuarios
  private router = inject(Router);                 // Navegación
  private alertCtrl = inject(AlertController);     // Alertas
  private toastCtrl = inject(ToastController);     // Notificaciones tipo toast

  // =========================
  // 📜 CONTROL DE SCROLL HEADER
  // =========================
  hideHeader = false; // Indica si el header se oculta
  lastScrollTop = 0;  // Guarda la última posición del scroll

  // =========================
  // 👤 DATOS DEL ADMIN
  // =========================
  adminData: UserData | null = null; // Información del admin actual

  // =========================
  // 👥 LISTA DE USUARIOS
  // =========================
  users$: Observable<UserData[]> = this.authService.getAllUsers(); 
  // Observable que obtiene todos los usuarios desde Firestore

  // =========================
  // 📊 ESTADÍSTICAS
  // =========================
  totalUsers = 0;       // Total de usuarios
  totalAdmins = 0;      // Total de administradores
  totalRegulares = 0;   // Total de usuarios normales

  // 🔹 Inyección en constructor (para usar en el HTML directamente)
  constructor(
    public weatherGlobal: WeatherGlobalService, // Clima global
    public timeService: TimeService             // Hora en tiempo real
  ) { }

  // =========================
  // 🚀 INICIALIZACIÓN
  // =========================
  async ngOnInit() {

    // Obtener datos del admin logueado
    this.adminData = await this.authService.getCurrentUserData();

    // Suscribirse a la lista de usuarios para calcular estadísticas
    this.users$.subscribe(users => {

      // Total de usuarios
      this.totalUsers = users.length;

      // Contar administradores
      this.totalAdmins = users.filter(u => u.rol === 'admin').length;

      // Contar usuarios normales
      this.totalRegulares = users.filter(u => u.rol === 'user').length;
    });
  }

  // =========================
  // 🔄 CAMBIAR ROL DE USUARIO
  // =========================
  async onChangeRole(user: UserData) {

    // Alterna el rol entre admin y user
    const nuevoRol = user.rol === 'admin' ? 'user' : 'admin';

    // Texto amigable del rol
    const rolLabel = nuevoRol === 'admin' ? 'Administrador' : 'Usuario';

    // Crear alerta de confirmación
    const alert = await this.alertCtrl.create({
      header: 'Cambiar rol',
      message: `¿Cambiar el rol de ${user.nombre} a ${rolLabel}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' }, // Botón cancelar
        {
          text: 'Confirmar',
          handler: async () => {
            try {

              // Actualiza el rol en Firestore
              await this.authService.updateUserRole(user.uid, nuevoRol);

              // Mostrar mensaje de éxito
              await this.showToast(`Rol de ${user.nombre} actualizado a ${rolLabel}`);

            } catch (error) {

              // Mostrar error
              await this.showToast('Error al actualizar el rol', 'danger');
            }
          }
        }
      ]
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // 🚪 CERRAR SESIÓN
  // =========================
  async onLogout() {

    // Alerta de confirmación
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' }, // Cancelar
        {
          text: 'Cerrar sesión',
          handler: async () => {

            // Cerrar sesión
            await this.authService.logout();

            // Redirigir al login
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // 🍞 TOAST (NOTIFICACIONES)
  // =========================
  private async showToast(message: string, color: string = 'success') {

    // Crear toast
    const toast = await this.toastCtrl.create({
      message,        // Mensaje a mostrar
      duration: 2500, // Duración en ms
      color,          // Color (success, danger, etc.)
      position: 'bottom' // Posición en pantalla
    });

    // Mostrar toast
    await toast.present();
  }

  // =========================
  // 🏠 IR AL HOME
  // =========================
  goHome() {

    // Navega a la página principal
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }

  // =========================
  // 📜 CONTROL DE SCROLL
  // =========================
  onScroll(event: any) {

    // Obtener posición actual del scroll
    const scrollTop = event.detail.scrollTop;

    // Si el usuario baja → ocultar header
    if (scrollTop > this.lastScrollTop && scrollTop > 50) {
      this.hideHeader = true;
    } else {

      // Si sube → mostrar header
      this.hideHeader = false;
    }

    // Guardar última posición
    this.lastScrollTop = scrollTop;
  }

  // =========================
  // 🌤️ ABRIR CLIMA EN GOOGLE
  // =========================
  openWeatherLink() {

    // Abre una nueva pestaña con el clima de Santiago
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
  }
}