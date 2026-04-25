// src/app/auth/register/register.page.ts

// =========================
// 🔹 IMPORTACIONES
// =========================

// Angular
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Ionic
import { LoadingController, AlertController } from '@ionic/angular';

// Servicios
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {

  // =========================
  // 🔹 INYECCIÓN DE DEPENDENCIAS
  // =========================
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  // =========================
  // 👁️ CONTROL VISUAL PASSWORD
  // =========================
  showPassword = false;
  showConfirmPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // =========================
  // 📋 FORMULARIO REACTIVO
  // =========================
  registerForm: FormGroup = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      preguntaSeguridad: ['', [Validators.required]],
      respuestaSeguridad: ['', [Validators.required, Validators.minLength(2)]],
    },
    { validators: this.passwordMatchValidator }
  );

  // =========================
  // 🔐 VALIDACIÓN PERSONALIZADA
  // =========================
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return password === confirmPassword
      ? null
      : { passwordMismatch: true };
  }

  // =========================
  // ✅ GETTERS (HTML)
  // =========================
  get nombre() { return this.registerForm.get('nombre'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get preguntaSeguridad() { return this.registerForm.get('preguntaSeguridad'); }
  get respuestaSeguridad() { return this.registerForm.get('respuestaSeguridad'); }

  // =========================
  // ❓ PREGUNTAS DE SEGURIDAD
  // =========================
  preguntasSeguridad = [
    '¿Cuál es el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es el nombre de tu mejor amigo de infancia?',
    '¿Cuál es tu película favorita?',
    '¿Cuál es el primer o segundo apellido de tu madre o tu padre?',
    '¿Cuál fue el nombre de tu primera escuela?',
  ];

  // =========================
  // 🚀 REGISTRO
  // =========================
  async onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
    });

    await loading.present();

    try {
      const {
        email,
        password,
        nombre,
        preguntaSeguridad,
        respuestaSeguridad,
      } = this.registerForm.value;

      await this.authService.register(email, password, nombre, 'user');

      await this.authService.updateProfile({
        preguntaSeguridad,
        respuestaSeguridad: respuestaSeguridad.toLowerCase().trim(),
      });

      await loading.dismiss();

      await this.showSuccess();

      this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      await this.showError(error.code);
    }
  }

  // =========================
  // ✅ ÉXITO
  // =========================
  private async showSuccess() {
    const alert = await this.alertCtrl.create({
      header: '¡Cuenta creada!',
      message: 'Tu cuenta fue creada exitosamente.',
      buttons: ['Continuar'],
    });

    await alert.present();
    await alert.onDidDismiss();
  }

  // =========================
  // ❌ ERRORES
  // =========================
  private async showError(errorCode: string) {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Este correo ya está registrado.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/weak-password': 'La contraseña es muy débil.',
    };

    const message =
      messages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';

    const alert = await this.alertCtrl.create({
      header: 'Error al registrarse',
      message,
      buttons: ['Aceptar'],
    });

    await alert.present();
  }

  // =========================
  // 🔙 NAVEGACIÓN
  // =========================
  goToLogin() {
    this.router.navigateByUrl('/login');
  }
}