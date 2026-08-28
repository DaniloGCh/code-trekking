// src/app/auth/register/register.page.ts

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';

import { ModalController } from '@ionic/angular';
import { TerminosModalComponent } from 'src/app/components/terminos-modal/terminos-modal.component';

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
  private security = inject(SecurityService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);

  // =========================
  // 👁️ CONTROL VISUAL PASSWORD
  // =========================
  showPassword = false;
  showConfirmPassword = false;
  // ✅ Estado del checkbox
  //terminosAceptados = false;

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

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
  // 📋 FORMULARIO
  // =========================
  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]], // ✅ Mínimo 8
    confirmPassword: ['', [Validators.required]],
    preguntaSeguridad: ['', [Validators.required]],
    respuestaSeguridad: ['', [Validators.required, Validators.minLength(2)]],
    // ✅ Aceptación de términos
    terminos: [false, Validators.requiredTrue]
  }, { validators: this.passwordMatchValidator });

  // =========================
  // ✅ GETTERS
  // =========================
  get nombre() { return this.registerForm.get('nombre'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get preguntaSeguridad() { return this.registerForm.get('preguntaSeguridad'); }
  get respuestaSeguridad() { return this.registerForm.get('respuestaSeguridad'); }
  get terminos() { return this.registerForm.get('terminos'); }
  // =========================
  // 🔐 VALIDADOR CONTRASEÑAS
  // =========================
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  // =========================
  // 💪 FORTALEZA DE CONTRASEÑA
  // =========================
  getPasswordStrength(): number {
    const pwd = this.password?.value || '';
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd)) score += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score += 25;
    return score;
  }

  getPasswordStrengthLabel(): string {
    const s = this.getPasswordStrength();
    if (s <= 25) return 'Muy débil 🔴';
    if (s <= 50) return 'Débil 🟠';
    if (s <= 75) return 'Media 🟡';
    return 'Fuerte 🟢';
  }

  // ✅ Métodos para reemplazar las regex en el HTML
  hasUpperCase(): boolean { return /[A-Z]/.test(this.password?.value || ''); }
  hasNumber(): boolean { return /[0-9]/.test(this.password?.value || ''); }
  hasSpecial(): boolean { return /[!@#$%^&*(),.?":{}|<>]/.test(this.password?.value || ''); }
  hasMinLength(): boolean { return (this.password?.value || '').length >= 8; }

  // =========================
  // 🚀 REGISTRO
  // =========================
  async onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password, nombre, preguntaSeguridad, respuestaSeguridad, terminos } = this.registerForm.value;

    // ✅ Validar email
    if (!this.security.isValidEmail(email)) {
      await this.showError('El correo no tiene un formato válido');
      return;
    }

    // ✅ Validar nombre seguro
    if (!this.security.isValidNombre(nombre)) {
      await this.showError('El nombre solo puede contener letras y espacios');
      return;
    }

    // ✅ Validar contraseña fuerte
    const passwordCheck = this.security.isStrongPassword(password);
    if (!passwordCheck.valid) {
      await this.showError(passwordCheck.message);
      return;
    }

    // ✅ Validar respuesta de seguridad
    if (!this.security.isSafeText(respuestaSeguridad, 100)) {
      await this.showError('La respuesta contiene caracteres no permitidos');
      return;
    }

    // ✅ Validar aceptación de términos
    if (this.terminos?.value !== true) {
      await this.showError(
        'Debes aceptar los términos y condiciones para registrarte'
      );
      return;
    }

    // ✅ Rate limiting: máx 3 registros por minuto
    if (!this.security.checkRateLimit('register', 3, 60000)) {
      await this.showError('Demasiados intentos. Espera 1 minuto.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando cuenta...' });
    await loading.present();

    try {
      // ✅ Sanitizar nombre antes de guardar
      const nombreSeguro = this.security.sanitizeInput(nombre.trim());

      // console.log('Antes de registrar:', this.terminosAceptados);

      await this.authService.register(email, password, nombreSeguro, 'user', terminos);

      await this.authService.updateProfile({
        preguntaSeguridad,
        respuestaSeguridad: respuestaSeguridad.toLowerCase().trim(),
      });

      this.security.resetRateLimit('register');
      await loading.dismiss();
      await this.showSuccess();
      this.router.navigateByUrl('/tabs/home', { replaceUrl: true });

    } catch (error: any) {
      await loading.dismiss();
      await this.showError(error.code);
    }
  }

  // =========================
  // ✅ Terminos y condiciones
  // =========================
  async onVerTerminos() {
    const modal = await this.modalCtrl.create({
      component: TerminosModalComponent,
      breakpoints: [0, 0.9],
      initialBreakpoint: 0.9,
      cssClass: 'terminos-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.aceptado) {
      this.registerForm.patchValue({
        terminos: true
      });
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
      'terminos-no-aceptados': 'Debes aceptar los términos y condiciones para registrarte.',
    };

    const message = messages[errorCode] || errorCode;

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