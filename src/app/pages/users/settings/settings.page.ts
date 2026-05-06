// =========================
// 📦 IMPORTS
// =========================
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular';

import { AuthService, UserData, ContactoEmergencia } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // =========================
  // 📊 ESTADO
  // =========================
  userData: UserData | null = null;

  contactos: ContactoEmergencia[] = [];

  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    this.userData = await this.authService.getCurrentUserData();
    this.contactos = this.userData?.contactosEmergencia || [];
  }

  // ➕ AGREGAR CONTACTO
  async onAgregarContacto() {
    if (this.contactos.length >= 3) {
      await this.showToast('Máximo 3 contactos de emergencia', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Agregar contacto de emergencia',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre completo',
        },
        {
          name: 'telefono',
          type: 'tel',
          placeholder: 'Teléfono (ej: +56912345678)',
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: async (data) => {
            if (!data.nombre || !data.telefono) {
              await this.showToast('Completa todos los campos', 'warning');
              return false;
            }

            if (data.nombre.trim().length < 3) {
              await this.showToast('El nombre debe tener mínimo 3 caracteres', 'warning');
              return false;
            }

            if (data.telefono.trim().length < 8) {
              await this.showToast('Ingresa un teléfono válido', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
            await loading.present();

            try {
              const nuevoContacto: ContactoEmergencia = {
                nombre: data.nombre.trim(),
                telefono: data.telefono.trim(),
              };

              this.contactos = [...this.contactos, nuevoContacto];
              await this.authService.updateProfile({ contactosEmergencia: this.contactos });
              await loading.dismiss();
              await this.showToast('Contacto agregado correctamente', 'success');
            } catch (error) {
              await loading.dismiss();
              await this.showToast('Error al guardar el contacto', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // ✏️ EDITAR CONTACTO
  async onEditarContacto(index: number) {
    const contacto = this.contactos[index];

    const alert = await this.alertCtrl.create({
      header: 'Editar contacto',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          value: contacto.nombre,
          placeholder: 'Nombre completo',
        },
        {
          name: 'telefono',
          type: 'tel',
          value: contacto.telefono,
          placeholder: 'Teléfono',
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.nombre || !data.telefono) {
              await this.showToast('Completa todos los campos', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
            await loading.present();

            try {
              this.contactos[index] = {
                nombre: data.nombre.trim(),
                telefono: data.telefono.trim(),
              };
              this.contactos = [...this.contactos];
              await this.authService.updateProfile({ contactosEmergencia: this.contactos });
              await loading.dismiss();
              await this.showToast('Contacto actualizado', 'success');
            } catch (error) {
              await loading.dismiss();
              await this.showToast('Error al actualizar el contacto', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // 🗑️ ELIMINAR CONTACTO
  async onEliminarContacto(index: number) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar contacto',
      message: `¿Eliminar a <strong>${this.contactos[index].nombre}</strong> de tus contactos de emergencia?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();

            try {
              this.contactos.splice(index, 1);
              this.contactos = [...this.contactos];
              await this.authService.updateProfile({ contactosEmergencia: this.contactos });
              await loading.dismiss();
              await this.showToast('Contacto eliminado', 'success');
            } catch (error) {
              await loading.dismiss();
              await this.showToast('Error al eliminar el contacto', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // 📞 LLAMAR AL CONTACTO
  llamarContacto(telefono: string) {
    window.open(`tel:${telefono}`, '_system');
  }

  // 💬 ENVIAR SMS AL CONTACTO
enviarSMS(telefono: string) {
  window.open(`sms:${telefono}`, '_system');
}

  // =========================
  // 🔐 CAMBIO DE CONTRASEÑA
  // =========================

  async onChangePassword() {
    const alert = await this.alertCtrl.create({
      header: 'Verificación de seguridad',
      message: this.userData?.preguntaSeguridad,
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

            if (!data.respuesta?.trim()) {
              await this.showToast('Ingresa tu respuesta de seguridad', 'warning');
              return false;
            }

            const ok = this.validateSecurityAnswer(data.respuesta);

            if (!ok) {
              await this.showToast('La respuesta de seguridad es incorrecta', 'danger');
              return false;
            }

            await this.showChangePasswordStep2();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private validateSecurityAnswer(answer: string): boolean {
    return this.userData?.respuestaSeguridad?.toLowerCase().trim() ===
      answer.toLowerCase().trim();
  }

  private async showChangePasswordStep2() {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar contraseña',
      inputs: [
        { name: 'currentPassword', type: 'password', placeholder: 'Contraseña actual' },
        { name: 'newPassword', type: 'password', placeholder: 'Nueva contraseña' },
        { name: 'confirmPassword', type: 'password', placeholder: 'Confirmar contraseña' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cambiar',
          handler: async (data) => this.handlePasswordChange(data)
        }
      ]
    });

    await alert.present();
  }

  private async handlePasswordChange(data: any): Promise<boolean> {

    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      await this.showToast('Completa todos los campos', 'warning');
      return false;
    }

    if (data.newPassword.length < 6) {
      await this.showToast('Mínimo 6 caracteres', 'warning');
      return false;
    }

    if (data.newPassword !== data.confirmPassword) {
      await this.showToast('Las contraseñas no coinciden', 'warning');
      return false;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Actualizando contraseña...'
    });

    await loading.present();

    try {
      await this.authService.changePassword(
        data.currentPassword,
        data.newPassword
      );

      await loading.dismiss();
      await this.showToast('Contraseña actualizada', 'success');

    } catch (error: any) {

      await loading.dismiss();

      const msg =
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
          ? 'La contraseña actual es incorrecta'
          : 'Error al cambiar la contraseña';

      await this.showToast(msg, 'danger');
    }

    return true;
  }

  // =========================
  // 🗑️ ELIMINAR CUENTA
  // =========================

  async onDeleteAccount() {
    const alert = await this.alertCtrl.create({
      header: '⚠️ Eliminar cuenta',
      message: 'Esta acción es irreversible. ¿Continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: () => this.showDeleteVerification()
        }
      ]
    });

    await alert.present();
  }

  private async showDeleteVerification() {
    const alert = await this.alertCtrl.create({
      header: 'Verificación de seguridad',
      message: this.userData?.preguntaSeguridad,
      inputs: [
        { name: 'respuesta', type: 'text', placeholder: 'Respuesta' },
        { name: 'password', type: 'password', placeholder: 'Contraseña' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async (data) => this.handleDeleteAccount(data)
        }
      ]
    });

    await alert.present();
  }

  private async handleDeleteAccount(data: any): Promise<boolean> {

    if (!data.respuesta || !data.password) {
      await this.showToast('Completa todos los campos', 'warning');
      return false;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Eliminando cuenta...'
    });

    await loading.present();

    try {
      await this.authService.deleteAccount(
        data.password,
        data.respuesta
      );

      await loading.dismiss();
      await this.showToast('Cuenta eliminada', 'success');

      this.router.navigateByUrl('/login', { replaceUrl: true });

    } catch (error: any) {

      await loading.dismiss();

      const messages: Record<string, string> = {
        'respuesta-incorrecta': 'Respuesta incorrecta',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/too-many-requests': 'Demasiados intentos',
      };

      const msg =
        messages[error.message] ||
        messages[error.code] ||
        'Error al eliminar cuenta';

      await this.showToast(msg, 'danger');
    }

    return true;
  }

  // =========================
  // 🔙 NAVEGACIÓN
  // =========================
  goBack() {
    this.router.navigateByUrl('/profile');
  }

  // =========================
  // 📜 SCROLL HEADER
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    this.hideHeader =
      scrollTop > this.lastScrollTop && scrollTop > 50;

    this.lastScrollTop = scrollTop;
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });

    await toast.present();
  }
}