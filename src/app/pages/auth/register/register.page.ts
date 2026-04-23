// src/app/auth/register/register.page.ts

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {

  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  // 👁️ Toggle password
  showPassword = false;
  showConfirmPassword = false;

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  // 📋 Formulario reactivo actualizado
registerForm: FormGroup = this.fb.group({
  nombre: ['', [Validators.required, Validators.minLength(3)]],
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]],
  confirmPassword: ['', [Validators.required]],
  preguntaSeguridad: ['', [Validators.required]],       // ✅ Nuevo
  respuestaSeguridad: ['', [Validators.required, Validators.minLength(2)]], // ✅ Nuevo
}, { validators: this.passwordMatchValidator });

  // ✅ Getters para validaciones en el HTML
  get nombre() { return this.registerForm.get('nombre'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
 

  // 🔐 Validador: contraseñas deben coincidir
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // 🚀 SUBMIT REGISTRO
  async onRegister() {
  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    return;
  }

  const loading = await this.loadingCtrl.create({ message: 'Creando cuenta...' });
  await loading.present();

  try {
    const { email, password, nombre, preguntaSeguridad, respuestaSeguridad } = this.registerForm.value;

    await this.authService.register(email, password, nombre, 'user');

    // ✅ Guardar pregunta y respuesta de seguridad
    await this.authService.updateProfile({
      preguntaSeguridad,
      respuestaSeguridad: respuestaSeguridad.toLowerCase().trim() // Guardamos en minúsculas
    });

    await loading.dismiss();
    await this.showSuccess();
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });

  } catch (error: any) {
    await loading.dismiss();
    await this.showError(error.code);
  }
}

  // ✅ Alert de éxito
  private async showSuccess() {
    const alert = await this.alertCtrl.create({
      header: '¡Cuenta creada!',
      message: 'Tu cuenta fue creada exitosamente.',
      buttons: ['Continuar'],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  // ❌ Manejo de errores de Firebase
  private async showError(errorCode: string) {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Este correo ya está registrado.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/weak-password': 'La contraseña es muy débil.',
    };

    const message = messages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';

    const alert = await this.alertCtrl.create({
      header: 'Error al registrarse',
      message,
      buttons: ['Aceptar'],
    });

    await alert.present();
  }

  // 🔙 Volver al login
  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  // 📋 Preguntas de seguridad disponibles
preguntasSeguridad = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es el nombre de tu mejor amigo de infancia?',
  '¿Cuál es tu película favorita?',
  '¿Cuál es el apellido de soltera de tu madre?',
  '¿Cuál fue el nombre de tu primera escuela?',
];

// ✅ Getters nuevos
get preguntaSeguridad() { return this.registerForm.get('preguntaSeguridad'); }
get respuestaSeguridad() { return this.registerForm.get('respuestaSeguridad'); }
}