import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.page.html',
  styleUrls: ['./galeria.page.scss'],
  standalone: false,
})
export class GaleriaPage implements OnInit {

  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private authService = inject(AuthService);

  userData: UserData | null = null;

  hideHeader = false;
  lastScrollTop = 0;

  constructor() { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(async user => {
      if (user) {
this.userData = await this.authService.getCurrentUserData();
      }
    });
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  // ==========================================
  // 💳 LÓGICA DE SUSCRIPCIÓN Y PLANES PREMIUM
  // ==========================================
  async seleccionarPlan(planKey: 'mensual' | 'trimestral' | 'anual') {
    const detallesPlan = {
      mensual: { nombre: 'Plan Mensual', precio: '$4.000' },
      trimestral: { nombre: 'Plan Trimestral (3 Meses)', precio: '$10.000' },
      anual: { nombre: 'Plan Anual (12 Meses)', precio: '$39.000' }
    };

    const plan = detallesPlan[planKey];
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Suscripción',
      subHeader: plan.nombre,
      message: `¿Deseas suscribirte por **${plan.precio}**? Se activarán todas las funciones Premium de inmediato.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Continuar al Pago',
          role: 'confirm',
          handler: () => {
            this.procesarPago(planKey);
          }
        }
      ]
    });

    await alert.present();
  }


  // ==========================================
  // SIMULACION DE PAGO Y ACTIVACION DE SUSCRIPCION PREMIUM
  // ==========================================
  private async procesarPago(planKey: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Procesando suscripción...',
      duration: 2000
    });
    await loading.present();

    // Simulación de procesamiento de pago
    setTimeout(async () => {
      await loading.dismiss();

      const exitoAlert = await this.alertCtrl.create({
        header: '¡Bienvenido a Premium! 🎉',
        message: 'Tu suscripción se ha activado con éxito.',
        buttons: ['Aceptar']
      });

      await exitoAlert.present();
      
      // Aquí puedes agregar lógica para actualizar el estado del usuario a Premium
      // o redirigirlo a otra vista si lo deseas.
    }, 2000);
  }

  // ==========================================
  // 🚪 CERRAR SESIÓN
  // ==========================================
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

}