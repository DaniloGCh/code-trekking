// src/app/auth/login/login.page.ts

// 🔹 Importación de Component para definir el componente
import { Component, inject } from '@angular/core';

// 🔹 Router para navegación entre páginas
import { Router } from '@angular/router';

// 🔹 Formularios reactivos (FormBuilder, FormGroup, validaciones)
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// 🔹 Controladores de Ionic (loading y alertas)
import { LoadingController, AlertController } from '@ionic/angular';

// 🔹 Servicio de autenticación
import { AuthService } from 'src/app/core/services/auth.service';

// 🔹 Controlador de notificaciones tipo toast
import { ToastController } from '@ionic/angular'; // ✅ Importado correctamente

@Component({
  selector: 'app-login', // Nombre del componente
  templateUrl: './login.page.html', // HTML asociado
  styleUrls: ['./login.page.scss'], // Estilos
  standalone: false,
})
export class LoginPage {

  // 🔹 Inyección de dependencias
  private authService = inject(AuthService);       // Servicio de autenticación
  private router = inject(Router);                 // Navegación
  private fb = inject(FormBuilder);                // Constructor de formularios
  private loadingCtrl = inject(LoadingController); // Loader (spinner)
  private alertCtrl = inject(AlertController);     // Alertas
  private toastCtrl = inject(ToastController);     // Toasts

  // =========================
  // 👁️ TOGGLE PASSWORD
  // =========================
  showPassword = false; // Controla si la contraseña se muestra o no

  togglePassword() {
    // Cambia entre true/false para mostrar u ocultar la contraseña
    this.showPassword = !this.showPassword;
  }

  // =========================
  // 📋 FORMULARIO REACTIVO
  // =========================
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]], // Campo email con validaciones
    password: ['', [Validators.required, Validators.minLength(6)]], // Campo password
  });

  // =========================
  // ✅ GETTERS PARA HTML
  // =========================
  get email() { return this.loginForm.get('email'); }     // Acceso fácil al control email
  get password() { return this.loginForm.get('password'); } // Acceso fácil al control password

  // =========================
  // 🚀 LOGIN
  // =========================
  async onLogin() {

    // Validar formulario
    if (this.loginForm.invalid) {

      // Marca todos los campos como tocados para mostrar errores
      this.loginForm.markAllAsTouched();
      return;
    }

    // Crear loading
    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
    });

    // Mostrar loading
    await loading.present();

    try {

      // Obtener valores del formulario
      const { email, password } = this.loginForm.value;

      // Intentar login con Firebase
      await this.authService.login(email, password);

      // Obtener rol del usuario
      const rol = await this.authService.getUserRole();

      // Cerrar loading
      await loading.dismiss();

      // Redirigir según rol
      if (rol === 'admin') {

        // Admin → dashboard
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });

      } else {

        // Usuario normal → home
        this.router.navigateByUrl('tabs/home', { replaceUrl: true });
      }

    } catch (error: any) {

      // Cerrar loading si hay error
      await loading.dismiss();

      // Mostrar mensaje de error
      await this.showError(error.code);
    }
  }

  // =========================
  // 🔁 RECUPERAR CONTRASEÑA
  // =========================
  async onForgotPassword() {

    // Crear alerta con input
    const alert = await this.alertCtrl.create({
      header: 'Recuperar contraseña',
      message: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',

          // Autocompleta con el email ingresado (si existe)
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

            // Validar email
            if (!data.email) {
              await this.showToast('Ingresa un correo válido', 'warning');
              return false;
            }

            // Loading mientras se envía correo
            const loading = await this.loadingCtrl.create({
              message: 'Enviando correo...'
            });
            await loading.present();

            try {

              // Enviar correo de recuperación
              await this.authService.resetPassword(data.email);

              await loading.dismiss();

              // Mensaje éxito
              await this.showToast('Correo enviado, revisa tu bandeja de entrada', 'success');

            } catch (error) {

              await loading.dismiss();

              // Mensaje error
              await this.showToast('No existe una cuenta con ese correo', 'danger');
            }

            return true;
          }
        }
      ]
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // ❌ MANEJO DE ERRORES
  // =========================
  private async showError(errorCode: string) {

    // Diccionario de errores Firebase
    const messages: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con este correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
    };

    // Selecciona mensaje o usa uno genérico
    const message = messages[errorCode] || 'Ocurrió un error. Intenta nuevamente.';

    // Crear alerta
    const alert = await this.alertCtrl.create({
      header: 'Error al iniciar sesión',
      message,
      buttons: ['Aceptar'],
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {

    // Crear notificación tipo toast
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });

    // Mostrar toast
    await toast.present();
  }

  // =========================
  // 📝 IR A REGISTRO
  // =========================
  goToRegister() {

    // Navega a la página de registro
    this.router.navigateByUrl('/register');
  }
}