// src/app/auth/register/register.page.ts

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private security = inject(SecurityService);

  // =========================
  // 👁️ CONTROL VISUAL PASSWORD
  // =========================
  showPassword = false;
  showConfirmPassword = false;

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  // =========================
  // 💪 INDICADOR FORTALEZA PASSWORD
  // =========================
  passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';
  passwordStrengthMsg = '';

  checkPasswordStrength(event: any) {
    const password = event.target.value || '';

    if (password.length === 0) {
      this.passwordStrength = '';
      this.passwordStrengthMsg = '';
      return;
    }

    let score = 0;
    if (password.length >= 8)                        score++;
    if (/[A-Z]/.test(password))                      score++;
    if (/[a-z]/.test(password))                      score++;
    if (/[0-9]/.test(password))                      score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) score++;

    if (score <= 2) {
      this.passwordStrength = 'weak';
      this.passwordStrengthMsg = 'Débil: agrega mayúsculas, números y símbolos';
    } else if (score <= 3) {
      this.passwordStrength = 'medium';
      this.passwordStrengthMsg = 'Media: agrega símbolos para hacerla más segura';
    } else {
      this.passwordStrength = 'strong';
      this.passwordStrengthMsg = 'Fuerte ✅';
    }
  }

  // =========================
  // 📋 FORMULARIO REACTIVO
  // =========================
  registerForm: FormGroup = this.fb.group(
    {
      nombre:             ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), this.noSpecialCharsValidator]],
      email:              ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password:           ['', [Validators.required, this.strongPasswordValidator]],
      confirmPassword:    ['', [Validators.required]],
      preguntaSeguridad:  ['', [Validators.required]],
      respuestaSeguridad: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    },
    { validators: this.passwordMatchValidator }
  );

  // =========================
  // 🔐 VALIDADORES PERSONALIZADOS
  // =========================

  // ✅ Contraseña fuerte
  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value || '';
    if (!password) return null;

    const errors: string[] = [];
    if (password.length < 8)                          errors.push('mínimo 8 caracteres');
    if (!/[A-Z]/.test(password))                      errors.push('una mayúscula');
    if (!/[a-z]/.test(password))                      errors.push('una minúscula');
    if (!/[0-9]/.test(password))                      errors.push('un número');
    if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) errors.push('un símbolo (!@#$...)');

    return errors.length > 0 ? { weakPassword: errors } : null;
  }

  // ✅ Sin caracteres especiales peligrosos en nombre
  private noSpecialCharsValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    const dangerous = /<|>|&|"|'|\/|\\|;|=|\(|\)|\{|\}|\[|\]/;
    return dangerous.test(value) ? { specialChars: true } : null;
  }

  // ✅ Contraseñas coinciden
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // =========================
  // ✅ GETTERS
  // =========================
  get nombre()             { return this.registerForm.get('nombre'); }
  get email()              { return this.registerForm.get('email'); }
  get password()           { return this.registerForm.get('password'); }
  get confirmPassword()    { return this.registerForm.get('confirmPassword'); }
  get preguntaSeguridad()  { return this.registerForm.get('preguntaSeguridad'); }
  get respuestaSeguridad() { return this.registerForm.get('respuestaSeguridad'); }

  // ✅ Getter para mostrar errores de contraseña débil
  get passwordErrors(): string {
    const errors = this.password?.errors?.['weakPassword'] as string[];
    if (!errors) return '';
    return 'Falta: ' + errors.join(', ');
  }

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

    // ✅ Rate limiting: evitar spam de registros
    if (!this.security.checkRateLimit('register', 3, 60000)) {
      await this.showError('too-many-attempts');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando cuenta...' });
    await loading.present();

    try {
      const { email, password, nombre, preguntaSeguridad, respuestaSeguridad } = this.registerForm.value;

      // ✅ Sanitizar nombre antes de guardar
      const nombreSeguro = this.security.sanitizeInput(nombre.trim());

      // ✅ Validar email con SecurityService
      if (!this.security.isValidEmail(email)) {
        throw { code: 'auth/invalid-email' };
      }

      // ✅ Validar texto seguro en nombre
      if (!this.security.isSafeText(nombreSeguro, 50)) {
        throw { code: 'invalid-nombre' };
      }

      await this.authService.register(email, password, nombreSeguro, 'user');

      await this.authService.updateProfile({
        preguntaSeguridad,
        // ✅ Sanitizar y normalizar respuesta
        respuestaSeguridad: this.security.sanitizeInput(
          respuestaSeguridad.toLowerCase().trim()
        ),
      });

      await loading.dismiss();
      await this.showSuccess();
      this.router.navigateByUrl('/tabs/home', { replaceUrl: true });

    } catch (error: any) {
      await loading.dismiss();
      await this.showError(error.code || error.message);
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
      'auth/invalid-email':        'El correo no es válido.',
      'auth/weak-password':        'La contraseña es muy débil.',
      'invalid-nombre':            'El nombre contiene caracteres no permitidos.',
      'too-many-attempts':         'Demasiados intentos. Espera 1 minuto.',
    };

    const message = messages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';

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