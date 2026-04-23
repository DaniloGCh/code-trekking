// src/app/pages/users/settings/settings.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService, UserData } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  userData: UserData | null = null;

   // 🔽 header scroll
  hideHeader = false;
  lastScrollTop = 0;

  async ngOnInit() {
    this.userData = await this.authService.getCurrentUserData();
  }

// 🔐 CAMBIAR CONTRASEÑA - Paso 1: Pregunta de seguridad
async onChangePassword() {
  const alert = await this.alertCtrl.create({
    header: 'Verificación de seguridad',
    message: `${this.userData?.preguntaSeguridad}`,
    inputs: [
      {
        name: 'respuesta',
        type: 'text',
        placeholder: 'Tu respuesta de seguridad',
      }
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Continuar',
        handler: async (data) => {
          if (!data.respuesta || data.respuesta.trim().length === 0) {
            await this.showToast('Ingresa tu respuesta de seguridad', 'warning');
            return false;
          }

          // Verificar respuesta contra Firestore
          const respuestaGuardada = this.userData?.respuestaSeguridad?.toLowerCase().trim();
          const respuestaIngresada = data.respuesta.toLowerCase().trim();

          if (respuestaGuardada !== respuestaIngresada) {
            await this.showToast('La respuesta de seguridad es incorrecta', 'danger');
            return false;
          }

          // ✅ Respuesta correcta, ir al paso 2
          await this.showChangePasswordStep2();
          return true;
        }
      }
    ]
  });

  await alert.present();
}

// 🔐 CAMBIAR CONTRASEÑA - Paso 2: Nueva contraseña
private async showChangePasswordStep2() {
  const alert = await this.alertCtrl.create({
    header: 'Cambiar contraseña',
    inputs: [
      {
        name: 'currentPassword',
        type: 'password',
        placeholder: 'Contraseña actual'
      },
      {
        name: 'newPassword',
        type: 'password',
        placeholder: 'Nueva contraseña (mín. 6 caracteres)'
      },
      {
        name: 'confirmPassword',
        type: 'password',
        placeholder: 'Confirmar nueva contraseña'
      }
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Cambiar',
        handler: async (data) => {
          if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
            await this.showToast('Completa todos los campos', 'warning');
            return false;
          }

          if (data.newPassword.length < 6) {
            await this.showToast('La contraseña debe tener mínimo 6 caracteres', 'warning');
            return false;
          }

          if (data.newPassword !== data.confirmPassword) {
            await this.showToast('Las contraseñas no coinciden', 'warning');
            return false;
          }

          const loading = await this.loadingCtrl.create({ message: 'Actualizando contraseña...' });
          await loading.present();

          try {
            await this.authService.changePassword(data.currentPassword, data.newPassword);
            await loading.dismiss();
            await this.showToast('Contraseña actualizada correctamente', 'success');
          } catch (error: any) {
            await loading.dismiss();
            const msg = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
              ? 'La contraseña actual es incorrecta'
              : 'Error al cambiar la contraseña';
            await this.showToast(msg, 'danger');
          }

          return true;
        }
      }
    ]
  });

  await alert.present();
}

  // 🗑️ ELIMINAR CUENTA
  async onDeleteAccount() {
    const confirmAlert = await this.alertCtrl.create({
      header: '⚠️ Eliminar cuenta',
      message: 'Esta acción es irreversible. Se eliminarán todos tus datos permanentemente. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: () => this.showDeleteVerification()
        }
      ]
    });

    await confirmAlert.present();
  }

  private async showDeleteVerification() {
    const alert = await this.alertCtrl.create({
      header: 'Verificación de seguridad',
      message: `${this.userData?.preguntaSeguridad}`,
      inputs: [
        {
          name: 'respuesta',
          type: 'text',
          placeholder: 'Tu respuesta de seguridad',
        },
        {
          name: 'password',
          type: 'password',
          placeholder: 'Tu contraseña actual',
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar cuenta',
          handler: async (data) => {
            if (!data.respuesta || !data.password) {
              await this.showToast('Completa todos los campos', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Eliminando cuenta...' });
            await loading.present();

            try {
              await this.authService.deleteAccount(data.password, data.respuesta);
              await loading.dismiss();
              await this.showToast('Cuenta eliminada correctamente', 'success');
              this.router.navigateByUrl('/login', { replaceUrl: true });
            } catch (error: any) {
              await loading.dismiss();
              const messages: Record<string, string> = {
                'respuesta-incorrecta': 'La respuesta de seguridad es incorrecta.',
                'auth/wrong-password': 'La contraseña es incorrecta.',
                'auth/invalid-credential': 'Las credenciales son inválidas.',
                'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
              };
              const msg = messages[error.message] || messages[error.code] || 'Error al eliminar la cuenta.';
              await this.showToast(msg, 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }



  // 🔙 VOLVER AL PERFIL
  goBack() {
    this.router.navigateByUrl('/tabs/profile');
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

  
}