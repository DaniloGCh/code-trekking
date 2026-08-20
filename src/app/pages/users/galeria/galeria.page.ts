import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.page.html',
  styleUrls: ['./galeria.page.scss'],
  standalone: false,
})
export class GaleriaPage implements OnInit {

  private router = inject(Router);
  private alertCtrl = inject(AlertController);
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
