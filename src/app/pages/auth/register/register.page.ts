// src/app/auth/register/register.page.ts

// 🔹 Decorador para definir el componente
import { Component, inject } from '@angular/core';

// 🔹 Router para navegación entre páginas
import { Router } from '@angular/router';

// 🔹 Formularios reactivos
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// 🔹 Controladores de Ionic (loading y alertas)
import { LoadingController, AlertController } from '@ionic/angular';

// 🔹 Servicio de autenticación
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-register', // Nombre del componente
  templateUrl: './register.page.html', // HTML asociado
  styleUrls: ['./register.page.scss'], // Estilos
  standalone: false,
})
export class RegisterPage {

  // 🔹 Inyección de dependencias
  private authService = inject(AuthService);       // Servicio de autenticación
  private router = inject(Router);                 // Navegación
  private fb = inject(FormBuilder);                // Formularios
  private loadingCtrl = inject(LoadingController); // Loader
  private alertCtrl = inject(AlertController);     // Alertas

  // =========================
  // 👁️ TOGGLE PASSWORD
  // =========================

  showPassword = false;         // Controla visibilidad de password
  showConfirmPassword = false;  // Controla visibilidad de confirmación

  // Alterna mostrar/ocultar contraseña
  togglePassword() { 
    this.showPassword = !this.showPassword; 
  }

  // Alterna mostrar/ocultar confirmación
  toggleConfirmPassword() { 
    this.showConfirmPassword = !this.showConfirmPassword; 
  }

  // =========================
  // 📋 FORMULARIO REACTIVO
  // =========================

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]], // Nombre con validación
    email: ['', [Validators.required, Validators.email]],         // Email válido
    password: ['', [Validators.required, Validators.minLength(6)]], // Password
    confirmPassword: ['', [Validators.required]],                 // Confirmación password
    preguntaSeguridad: ['', [Validators.required]],               // ✅ Pregunta seguridad
    respuestaSeguridad: ['', [Validators.required, Validators.minLength(2)]], // ✅ Respuesta
  }, { validators: this.passwordMatchValidator }); // 🔐 Validador personalizado

  // =========================
  // ✅ GETTERS PARA HTML
  // =========================

  get nombre() { return this.registerForm.get('nombre'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  // =========================
  // 🔐 VALIDACIÓN PASSWORD
  // =========================

  // Valida que password y confirmPassword sean iguales
  private passwordMatchValidator(form: FormGroup) {

    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    // Si coinciden → válido, si no → error
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // =========================
  // 🚀 REGISTRO
  // =========================

  async onRegister() {

    // Validar formulario
    if (this.registerForm.invalid) {

      // Marca todos los campos como tocados para mostrar errores
      this.registerForm.markAllAsTouched();
      return;
    }

    // Crear loading
    const loading = await this.loadingCtrl.create({ 
      message: 'Creando cuenta...' 
    });

    await loading.present();

    try {

      // Obtener datos del formulario
      const { email, password, nombre, preguntaSeguridad, respuestaSeguridad } = this.registerForm.value;

      // Registrar usuario en Firebase Auth + Firestore
      await this.authService.register(email, password, nombre, 'user');

      // Guardar datos adicionales (pregunta y respuesta de seguridad)
      await this.authService.updateProfile({
        preguntaSeguridad,
        respuestaSeguridad: respuestaSeguridad.toLowerCase().trim() // Normaliza respuesta
      });

      await loading.dismiss();

      // Mostrar mensaje de éxito
      await this.showSuccess();

      // Redirigir al home
      this.router.navigateByUrl('/tabs/home', { replaceUrl: true });

    } catch (error: any) {

      await loading.dismiss();

      // Mostrar error
      await this.showError(error.code);
    }
  }

  // =========================
  // ✅ ALERTA ÉXITO
  // =========================

  private async showSuccess() {

    const alert = await this.alertCtrl.create({
      header: '¡Cuenta creada!',
      message: 'Tu cuenta fue creada exitosamente.',
      buttons: ['Continuar'],
    });

    await alert.present();

    // Espera a que el usuario cierre la alerta
    await alert.onDidDismiss();
  }

  // =========================
  // ❌ MANEJO DE ERRORES
  // =========================

  private async showError(errorCode: string) {

    // Diccionario de errores Firebase
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Este correo ya está registrado.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/weak-password': 'La contraseña es muy débil.',
    };

    // Selecciona mensaje o usa uno genérico
    const message = messages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';

    const alert = await this.alertCtrl.create({
      header: 'Error al registrarse',
      message,
      buttons: ['Aceptar'],
    });

    await alert.present();
  }

  // =========================
  // 🔙 IR AL LOGIN
  // =========================

  goToLogin() {

    // Navega a la pantalla de login
    this.router.navigateByUrl('/login');
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
  // ✅ GETTERS ADICIONALES
  // =========================

  get preguntaSeguridad() { return this.registerForm.get('preguntaSeguridad'); }
  get respuestaSeguridad() { return this.registerForm.get('respuestaSeguridad'); }
}