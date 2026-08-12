// 🔹 Angular core
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

// 🔹 Formularios reactivos
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// 🔹 Ionic controllers
import { LoadingController, AlertController, ToastController } from '@ionic/angular';

// 🔹 Servicios
import { AuthService } from 'src/app/core/services/auth.service';

import { SecurityService } from 'src/app/core/services/security.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private security = inject(SecurityService);

  // =========================
  // 👁️ PASSWORD VISIBILITY
  // =========================
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // =========================
  // 📋 FORMULARIO LOGIN
  // =========================
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // =========================
  // 🔹 GETTERS (HTML)
  // =========================
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  // =========================
  // 🚀 LOGIN
  // =========================
  async onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // ✅ Rate limiting en el frontend
    if (!this.security.checkRateLimit('login-page', 5, 60000)) {
      await this.showError('too-many-attempts');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Iniciando sesión...' });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;

      // ✅ Validar email antes de enviar
      if (!this.security.isValidEmail(email)) {
        throw { code: 'auth/invalid-email' };
      }

      await this.authService.login(email, password);
      const rol = await this.authService.getUserRole();
      await loading.dismiss();

      if (rol === 'admin') {
        this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }

    } catch (error: any) {
      await loading.dismiss();
      await this.showError(error.code || error.message);
    }
  }

  // =========================
  // 🔁 RECUPERAR CONTRASEÑA
  // =========================
  async onForgotPassword() {

    const alert = await this.alertCtrl.create({
      header: 'Recuperar contraseña',
      message: 'Ingresa tu correo para restablecer tu contraseña.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',
          value: this.email?.value || ''
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar',
          handler: async (data) => {

            if (!data.email) {
              await this.showToast('Ingresa un correo válido', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({
              message: 'Enviando correo...'
            });

            await loading.present();

            try {
              await this.authService.resetPassword(data.email);

              await loading.dismiss();
              await this.showToast('Correo enviado correctamente', 'success');

            } catch (error) {
              await loading.dismiss();
              await this.showToast('No existe una cuenta con ese correo', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // ❌ ERRORES LOGIN
  // =========================
  private async showError(errorCode: string) {
    const messages: Record<string, string> = {
      'auth/user-not-found': 'Credenciales inválidas.',        // ✅ Mensaje genérico (no revela si existe)
      'auth/wrong-password': 'Credenciales inválidas.',        // ✅ Mismo mensaje por seguridad
      'auth/invalid-email': 'El correo no es válido.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/invalid-credential': 'Credenciales inválidas.',
      'too-many-attempts': 'Demasiados intentos. Espera 1 minuto.',
    };

    const message = messages[errorCode] || 'Error al iniciar sesión. Intenta nuevamente.';
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message,
      buttons: ['Aceptar'],
    });
    await alert.present();
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {

    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });

    await toast.present();
  }

  // =========================
  // 📝 NAVEGACIÓN
  // =========================
  goToRegister() {
    this.router.navigateByUrl('/register');
  }
}