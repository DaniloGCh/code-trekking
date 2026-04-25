// src/app/pages/profile/profile.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, ActionSheetController } from '@ionic/angular';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private actionSheetCtrl = inject(ActionSheetController);

  userData: UserData | null = null;

  // 🔽 header scroll
  hideHeader = false;
  lastScrollTop = 0;

  // 😊 Opciones de estado de ánimo
  estados = [
    { label: 'Excelente 😄', value: 'Excelente 😄' },
    { label: 'Bien 🙂', value: 'Bien 🙂' },
    { label: 'Normal 😐', value: 'Normal 😐' },
    { label: 'Cansado 😴', value: 'Cansado 😴' },
    { label: 'Estresado 😤', value: 'Estresado 😤' },
    { label: 'Triste 😢', value: 'Triste 😢' },
  ];

  async ngOnInit() {
    this.userData = await this.authService.getCurrentUserData();
  }

  // 📷 SELECCIONAR FOTO (galería o cámara)
  async onChangeFoto() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Foto de perfil',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera-outline',
          handler: () => this.takePicture(CameraSource.Camera)
        },
        {
          text: 'Elegir de galería',
          icon: 'image-outline',
          handler: () => this.takePicture(CameraSource.Photos)
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });

    await actionSheet.present();
  }

  private async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source
      });

      if (image.base64String) {
        const base64 = `data:image/jpeg;base64,${image.base64String}`;

        const loading = await this.loadingCtrl.create({ message: 'Guardando foto...' });
        await loading.present();

        await this.authService.updateProfile({ fotoBase64: base64 });

        // Actualizar localmente
        if (this.userData) this.userData.fotoBase64 = base64;

        await loading.dismiss();
        await this.showToast('Foto actualizada correctamente', 'success');
      }
    } catch (error) {
      await this.showToast('No se pudo obtener la foto', 'danger');
    }
  }

  // ✏️ EDITAR NOMBRE
  async onEditNombre() {
    const alert = await this.alertCtrl.create({
      header: 'Editar nombre',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          value: this.userData?.nombre || '',
          placeholder: 'Tu nombre'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.nombre || data.nombre.trim().length < 3) {
              await this.showToast('El nombre debe tener al menos 3 caracteres', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
            await loading.present();

            await this.authService.updateProfile({ nombre: data.nombre.trim() });
            if (this.userData) this.userData.nombre = data.nombre.trim();

            await loading.dismiss();
            await this.showToast('Nombre actualizado', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // 😊 CAMBIAR ESTADO DE ÁNIMO
  async onChangeEstado() {
    const alert = await this.alertCtrl.create({
      header: '¿Cómo te sientes hoy?',
      inputs: [
        // ✅ Opciones predefinidas
        ...this.estados.map(e => ({
          type: 'radio' as const,
          label: e.label,
          value: e.value,
          checked: this.userData?.estado === e.value
        })),
        // ✅ Opción personalizada
        {
          type: 'radio' as const,
          label: '✏️ Escribir mi propio estado',
          value: 'custom',
          checked: this.userData?.estado !== '' &&
            !this.estados.some(e => e.value === this.userData?.estado)
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Siguiente',
          handler: async (selected) => {
            if (!selected) return false;

            if (selected === 'custom') {
              // Mostrar input para escribir estado personalizado
              await this.showCustomEstadoInput();
            } else {
              await this.saveEstado(selected);
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // ✏️ Input para estado personalizado
  private async showCustomEstadoInput() {
    const alert = await this.alertCtrl.create({
      header: 'Estado personalizado',
      message: 'Escribe cómo te sientes hoy',
      inputs: [
        {
          name: 'estadoCustom',
          type: 'text',
          placeholder: 'Ej: Con mucha energía 💪',
          value: !this.estados.some(e => e.value === this.userData?.estado)
            ? this.userData?.estado || ''
            : '',
          attributes: { maxlength: 50 }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.estadoCustom || data.estadoCustom.trim().length === 0) {
              await this.showToast('Escribe algo para tu estado', 'warning');
              return false;
            }
            await this.saveEstado(data.estadoCustom.trim());
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // 💾 Guardar estado en Firestore
  private async saveEstado(estado: string) {
    const loading = await this.loadingCtrl.create({ message: 'Guardando estado...' });
    await loading.present();

    await this.authService.updateProfile({ estado });
    if (this.userData) this.userData.estado = estado;

    await loading.dismiss();
    await this.showToast('Estado actualizado', 'success');
  }

  // 🔐 CAMBIAR CONTRASEÑA
  async onChangePassword() {
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

  // 🗑️ ELIMINAR CUENTA
  async onDeleteAccount() {

    // Paso 1 - Advertencia inicial
    const confirmAlert = await this.alertCtrl.create({
      header: '⚠️ Eliminar cuenta',
      message: 'Esta acción es irreversible. Se eliminarán todos tus datos permanentemente. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          role: 'confirm',
          handler: () => this.showDeleteVerification()
        }
      ]
    });

    await confirmAlert.present();
  }

  // Paso 2 - Verificación con pregunta de seguridad y contraseña
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

  goLogin() {
    this.router.navigateByUrl('/login');
  }

  goRegister() {
    this.router.navigateByUrl('/register');
  }
}