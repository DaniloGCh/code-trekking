// src/app/auth/login/login.page.ts

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastController } from '@ionic/angular'; // ✅ Importado correctamente
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {

  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController); // ✅ Inyectado correctamente

  // 👁️ Toggle mostrar/ocultar password
  showPassword = false;

  // 📋 Formulario reactivo
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // ✅ Getters para validaciones en el HTML
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  // 🚀 SUBMIT LOGIN
  async onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // ✅ Muestra todos los errores si intenta enviar sin llenar
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);

      const rol = await this.authService.getUserRole();

      await loading.dismiss();

      if (rol === 'admin') {
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      } else {
        this.router.navigateByUrl('tabs/home', { replaceUrl: true });
      }

    } catch (error: any) {
      await loading.dismiss();
      await this.showError(error.code);
    }
  }

  
  
  // ✅ OLVIDASTE TU CONTRASEÑA
  async onForgotPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Recuperar contraseña',
      message: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',
          value: this.email?.value || ''
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
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
              await this.showToast('Correo enviado, revisa tu bandeja de entrada', 'success');
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

  // ❌ Manejo de errores de Firebase
  private async showError(errorCode: string) {
    const messages: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con este correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
    };

    const message = messages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';

    const alert = await this.alertCtrl.create({
      header: 'Error al iniciar sesión',
      message,
      buttons: ['Aceptar'],
    });

    await alert.present();
  }

  // Y el método showToast corregido
private async showToast(message: string, color: string = 'success') {
  const toast = await this.toastCtrl.create({
    message,
    duration: 3000,
    color,
    position: 'bottom'
  });
  await toast.present();
}

  // 📝 Ir a registro
  goToRegister() {
    this.router.navigateByUrl('/register');
  }
}