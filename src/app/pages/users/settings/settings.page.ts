// =========================
// 📦 IMPORTS
// =========================
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService, UserData, ContactoEmergencia } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';

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
  private security = inject(SecurityService); // ✅ Nuevo

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

  // =========================
  // 🔧 VALIDACIONES CONTACTO
  // =========================
  private validarContacto(nombre: string, telefono: string): string | null {
    if (!nombre || !telefono) return 'Completa todos los campos';

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();

    // ✅ Validar nombre
    if (nombreLimpio.length < 3) return 'El nombre debe tener mínimo 3 caracteres';
    if (nombreLimpio.length > 50) return 'El nombre no puede superar 50 caracteres';
    if (!this.security.isSafeText(nombreLimpio, 50)) return 'El nombre contiene caracteres no permitidos';

    // ✅ Validar teléfono con formato internacional
    const telefonoRegex = /^\+?[0-9]{8,15}$/;
    if (!telefonoRegex.test(telefonoLimpio.replace(/\s/g, ''))) {
      return 'Ingresa un teléfono válido (ej: +56912345678)';
    }

    return null; // Sin errores
  }

  // ➕ AGREGAR CONTACTO
  async onAgregarContacto() {
    if (this.contactos.length >= 3) {
      await this.showToast('Máximo 3 contactos de emergencia', 'warning');
      return;
    }

    // ✅ Rate limiting: evitar spam
    if (!this.security.checkRateLimit('agregar-contacto', 5, 60000)) {
      await this.showToast('Demasiados intentos. Espera un momento.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Agregar contacto de emergencia',
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre completo' },
        { name: 'telefono', type: 'tel', placeholder: 'Teléfono (ej: +56912345678)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: async (data) => {
            // ✅ Validar con método centralizado
            const error = this.validarContacto(data.nombre, data.telefono);
            if (error) {
              await this.showToast(error, 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
            await loading.present();

            try {
              const nuevoContacto: ContactoEmergencia = {
                // ✅ Sanitizar nombre y formatear teléfono
                nombre:   this.security.sanitizeInput(data.nombre.trim()),
                telefono: data.telefono.trim().replace(/\s/g, ''),
              };

              this.contactos = [...this.contactos, nuevoContacto];
              await this.authService.updateProfile({ contactosEmergencia: this.contactos });
              await loading.dismiss();
              await this.showToast('Contacto agregado correctamente', 'success');
            } catch {
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
        { name: 'nombre', type: 'text', value: contacto.nombre, placeholder: 'Nombre completo' },
        { name: 'telefono', type: 'tel', value: contacto.telefono, placeholder: 'Teléfono' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            // ✅ Validar con método centralizado
            const error = this.validarContacto(data.nombre, data.telefono);
            if (error) {
              await this.showToast(error, 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
            await loading.present();

            try {
              this.contactos[index] = {
                nombre:   this.security.sanitizeInput(data.nombre.trim()),
                telefono: data.telefono.trim().replace(/\s/g, ''),
              };
              this.contactos = [...this.contactos];
              await this.authService.updateProfile({ contactosEmergencia: this.contactos });
              await loading.dismiss();
              await this.showToast('Contacto actualizado', 'success');
            } catch {
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
            } catch {
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
    // ✅ Validar que sea un teléfono antes de abrir
    const telefonoRegex = /^\+?[0-9]{8,15}$/;
    if (!telefonoRegex.test(telefono.replace(/\s/g, ''))) return;
    window.open(`tel:${telefono}`, '_system');
  }

  // 💬 ENVIAR SMS
  enviarSMS(telefono: string) {
    // ✅ Validar que sea un teléfono antes de abrir
    const telefonoRegex = /^\+?[0-9]{8,15}$/;
    if (!telefonoRegex.test(telefono.replace(/\s/g, ''))) return;
    window.open(`sms:${telefono}`, '_system');
  }

  // =========================
  // 🔐 CAMBIO DE CONTRASEÑA
  // =========================
  async onChangePassword() {
    // ✅ Rate limiting
    if (!this.security.checkRateLimit('change-password', 3, 60000)) {
      await this.showToast('Demasiados intentos. Espera 1 minuto.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Verificación de seguridad',
      message: `<strong>${this.userData?.preguntaSeguridad}</strong>`,
      inputs: [
        { name: 'respuesta', type: 'text', placeholder: 'Tu respuesta de seguridad' }
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

            // ✅ Sanitizar antes de comparar
            const respuestaIngresada = this.security
              .sanitizeInput(data.respuesta)
              .toLowerCase()
              .trim();

            if (!this.validateSecurityAnswer(respuestaIngresada)) {
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
    return this.userData?.respuestaSeguridad?.toLowerCase().trim() === answer;
  }

  private async showChangePasswordStep2() {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar contraseña',
      inputs: [
        { name: 'currentPassword', type: 'password', placeholder: 'Contraseña actual' },
        { name: 'newPassword', type: 'password', placeholder: 'Nueva contraseña (mín. 8 caracteres)' },
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

    // ✅ Validar fortaleza de nueva contraseña
    const passwordCheck = this.security.isStrongPassword(data.newPassword);
    if (!passwordCheck.valid) {
      await this.showToast(passwordCheck.message, 'warning');
      return false;
    }

    if (data.newPassword !== data.confirmPassword) {
      await this.showToast('Las contraseñas no coinciden', 'warning');
      return false;
    }

    // ✅ No permitir misma contraseña
    if (data.currentPassword === data.newPassword) {
      await this.showToast('La nueva contraseña debe ser diferente a la actual', 'warning');
      return false;
    }

    const loading = await this.loadingCtrl.create({ message: 'Actualizando contraseña...' });
    await loading.present();

    try {
      await this.authService.changePassword(data.currentPassword, data.newPassword);
      await loading.dismiss();
      await this.showToast('Contraseña actualizada correctamente', 'success');
      this.security.resetRateLimit('change-password');
    } catch (error: any) {
      await loading.dismiss();
      const msg = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
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
    // ✅ Rate limiting para eliminación
    if (!this.security.checkRateLimit('delete-account', 2, 300000)) {
      await this.showToast('Demasiados intentos. Espera 5 minutos.', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: '⚠️ Eliminar cuenta',
      message: 'Esta acción es <strong>irreversible</strong>. Se eliminarán todos tus datos permanentemente. ¿Continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Continuar', handler: () => this.showDeleteVerification() }
      ]
    });

    await alert.present();
  }

  private async showDeleteVerification() {
    const alert = await this.alertCtrl.create({
      header: 'Verificación de seguridad',
      message: `<strong>${this.userData?.preguntaSeguridad}</strong>`,
      inputs: [
        { name: 'respuesta', type: 'text', placeholder: 'Tu respuesta de seguridad' },
        { name: 'password', type: 'password', placeholder: 'Tu contraseña actual' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar cuenta',
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

    // ✅ Sanitizar respuesta antes de comparar
    const respuestaSanitizada = this.security
      .sanitizeInput(data.respuesta)
      .toLowerCase()
      .trim();

    const loading = await this.loadingCtrl.create({ message: 'Eliminando cuenta...' });
    await loading.present();

    try {
      await this.authService.deleteAccount(data.password, respuestaSanitizada);
      await loading.dismiss();

      // ✅ Limpiar localStorage al eliminar cuenta
      localStorage.clear();

      await this.showToast('Cuenta eliminada correctamente', 'success');
      this.router.navigateByUrl('/login', { replaceUrl: true });

    } catch (error: any) {
      await loading.dismiss();

      const messages: Record<string, string> = {
        'respuesta-incorrecta':    'La respuesta de seguridad es incorrecta.',
        'auth/wrong-password':     'La contraseña es incorrecta.',
        'auth/invalid-credential': 'Las credenciales son inválidas.',
        'auth/too-many-requests':  'Demasiados intentos. Intenta más tarde.',
      };

      const msg = messages[error.message] || messages[error.code] || 'Error al eliminar la cuenta.';
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
  // 📜 SCROLL
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
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