// src/app/auth/register/register.page.ts

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';
import { ModalController } from '@ionic/angular';
import { TerminosModalComponent } from 'src/app/components/terminos-modal/terminos-modal.component';

// Decorador que define los metadatos del componente de Angular
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
  private authService = inject(AuthService); // Inyecta el servicio de autenticación
  private security = inject(SecurityService); // Inyecta el servicio de seguridad y sanitización
  private router = inject(Router); // Inyecta el enrutador de Angular
  private fb = inject(FormBuilder); // Inyecta el constructor para armar formularios reactivos
  private loadingCtrl = inject(LoadingController); // Inyecta el controlador de estados de carga
  private alertCtrl = inject(AlertController); // Inyecta el controlador de alertas emergentes
  private modalCtrl = inject(ModalController); // Inyecta el controlador de modales de Ionic

  // =========================
  // 👁️ CONTROL VISUAL PASSWORD
  // =========================
  showPassword = false; // Estado booleano para alternar la visibilidad de la contraseña principal
  showConfirmPassword = false; // Estado booleano para alternar la visibilidad de la confirmación de contraseña


  togglePassword() { this.showPassword = !this.showPassword; } // Alterna el valor booleano de showPassword
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; } // Alterna el valor booleano de showConfirmPassword

  // =========================
  // ❓ PREGUNTAS DE SEGURIDAD
  // =========================
  preguntasSeguridad = [
    '¿Cuál es el nombre de tu primera mascota?', // Opción 1 de pregunta de seguridad
    '¿En qué ciudad naciste?', // Opción 2 de pregunta de seguridad
    '¿Cuál es el nombre de tu mejor amigo de infancia?', // Opción 3 de pregunta de seguridad
    '¿Cuál es tu película favorita?', // Opción 4 de pregunta de seguridad
    '¿Cuál es el primer o segundo apellido de tu madre o tu padre?', // Opción 5 de pregunta de seguridad
    '¿Cuál fue el nombre de tu primera escuela?', // Opción 6 de pregunta de seguridad
  ];

  // =========================
  // 📋 FORMULARIO
  // =========================
  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]], // Campo nombre: requerido, entre 3 y 50 caracteres
    email: ['', [Validators.required, Validators.email]], // Campo email: requerido y debe tener formato de correo válido
    password: ['', [Validators.required, Validators.minLength(8)]], // Campo contraseña: requerido y mínimo 8 caracteres
    confirmPassword: ['', [Validators.required]], // Campo confirmación de contraseña: requerido
    preguntaSeguridad: ['', [Validators.required]], // Campo pregunta de seguridad: requerida selección
    respuestaSeguridad: ['', [Validators.required, Validators.minLength(2)]], // Campo respuesta de seguridad: requerida y mínimo 2 caracteres
    // ✅ Aceptación de términos
    terminos: [false, Validators.requiredTrue] // Campo términos: requiere que el valor sea explícitamente true
  }, { validators: this.passwordMatchValidator }); // Validador personalizado a nivel de grupo para comparar contraseñas

  // =========================
  // ✅ GETTERS
  // =========================
  get nombre() { return this.registerForm.get('nombre'); } // Obtiene la referencia del control 'nombre'
  get email() { return this.registerForm.get('email'); } // Obtiene la referencia del control 'email'
  get password() { return this.registerForm.get('password'); } // Obtiene la referencia del control 'password'
  get confirmPassword() { return this.registerForm.get('confirmPassword'); } // Obtiene la referencia del control 'confirmPassword'
  get preguntaSeguridad() { return this.registerForm.get('preguntaSeguridad'); } // Obtiene la referencia del control 'preguntaSeguridad'
  get respuestaSeguridad() { return this.registerForm.get('respuestaSeguridad'); } // Obtiene la referencia del control 'respuestaSeguridad'
  get terminos() { return this.registerForm.get('terminos'); } // Obtiene la referencia del control 'terminos'
  // =========================
  // 🔐 VALIDADOR CONTRASEÑAS
  // =========================
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value; // Obtiene el valor ingresado en password
    const confirm = form.get('confirmPassword')?.value; // Obtiene el valor ingresado en confirmPassword
    return password === confirm ? null : { passwordMismatch: true }; // Retorna null si coinciden o el objeto de error si no
  }

  // =========================
  // 💪 FORTALEZA DE CONTRASEÑA
  // =========================
  getPasswordStrength(): number {
    const pwd = this.password?.value || ''; // Obtiene el valor del campo contraseña o un string vacío
    let score = 0; // Inicializa el puntaje en 0
    if (pwd.length >= 8) score += 25; // Suma 25 puntos si tiene al menos 8 caracteres
    if (/[A-Z]/.test(pwd)) score += 25; // Suma 25 puntos si contiene al menos una letra mayúscula
    if (/[0-9]/.test(pwd)) score += 25; // Suma 25 puntos si contiene al menos un número
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score += 25; // Suma 25 puntos si contiene al menos un carácter especial
    return score; // Retorna el puntaje acumulado de 0 a 100
  }

  getPasswordStrengthLabel(): string {
    const s = this.getPasswordStrength(); // Calcula la fortaleza actual de la contraseña
    if (s <= 25) return 'Muy débil 🔴'; // Retorna etiqueta muy débil para puntajes de 25 o menos
    if (s <= 50) return 'Débil 🟠'; // Retorna etiqueta débil para puntajes de 50 o menos
    if (s <= 75) return 'Media 🟡'; // Retorna etiqueta media para puntajes de 75 o menos
    return 'Fuerte 🟢'; // Retorna etiqueta fuerte para puntajes mayores a 75
  }

  // ✅ Métodos para reemplazar las regex en el HTML
  hasUpperCase(): boolean { return /[A-Z]/.test(this.password?.value || ''); } // Evalúa si la contraseña incluye mayúsculas
  hasNumber(): boolean { return /[0-9]/.test(this.password?.value || ''); } // Evalúa si la contraseña incluye números
  hasSpecial(): boolean { return /[!@#$%^&*(),.?":{}|<>]/.test(this.password?.value || ''); } // Evalúa si la contraseña incluye caracteres especiales
  hasMinLength(): boolean { return (this.password?.value || '').length >= 8; } // Evalúa si la contraseña cumple con la longitud mínima de 8

  // =========================
  // 🚀 REGISTRO
  // =========================
  async onRegister() {
    if (this.registerForm.invalid) { // Comprueba si el formulario no cumple todas las validaciones
      this.registerForm.markAllAsTouched(); // Marca todos los campos como tocados para gatillar los mensajes visuales de error
      return; // Interrumpe la ejecución de la función
    }

    const { email, password, nombre, preguntaSeguridad, respuestaSeguridad, terminos } = this.registerForm.value; // Desestructura los valores del formulario

    // ✅ Validar email
    if (!this.security.isValidEmail(email)) { // Verifica el formato de correo a través del servicio de seguridad
      await this.showError('El correo no tiene un formato válido'); // Muestra la alerta de error si es inválido
      return; // Cancela el proceso
    }

    // ✅ Validar nombre seguro
    if (!this.security.isValidNombre(nombre)) { // Comprueba que el nombre contenga únicamente letras y espacios
      await this.showError('El nombre solo puede contener letras y espacios'); // Muestra la alerta correspondiente
      return; // Cancela el proceso
    }

    // ✅ Validar contraseña fuerte
    const passwordCheck = this.security.isStrongPassword(password); // Ejecuta la validación de complejidad sobre la contraseña
    if (!passwordCheck.valid) { // Si la contraseña no cumple las reglas de fortaleza
      await this.showError(passwordCheck.message); // Muestra el mensaje con el motivo específico de fallo
      return; // Cancela el proceso
    }

    // ✅ Validar respuesta de seguridad
    if (!this.security.isSafeText(respuestaSeguridad, 100)) { // Sanitiza y revisa el texto de la respuesta de seguridad
      await this.showError('La respuesta contiene caracteres no permitidos'); // Muestra la alerta de caracteres inválidos
      return; // Cancela el proceso
    }

    // ✅ Validar aceptación de términos
    if (this.terminos?.value !== true) { // Confirma que el control de términos tenga valor true
      await this.showError(
        'Debes aceptar los términos y condiciones para registrarte'
      ); // Muestra la advertencia si no se aceptaron los términos
      return; // Cancela el proceso
    }

    // ✅ Rate limiting: máx 3 registros por minuto
    if (!this.security.checkRateLimit('register', 3, 60000)) { // Limita la cantidad de intentos permitidos en un marco de tiempo
      await this.showError('Demasiados intentos. Espera 1 minuto.'); // Notifica al usuario el bloqueo temporal
      return; // Cancela el proceso
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando cuenta...' }); // Instancia el modal con spinner de carga
    await loading.present(); // Despliega la ventana de carga en pantalla

    try {
      // ✅ Sanitizar nombre antes de guardar
      const nombreSeguro = this.security.sanitizeInput(nombre.trim()); // Limpia espacios y caracteres peligrosos del nombre

      // console.log('Antes de registrar:', this.terminosAceptados);

      await this.authService.register(email, password, nombreSeguro, 'user', terminos); // Llama al servicio para registrar al usuario con rol 'user'

      await this.authService.updateProfile({
        preguntaSeguridad, // Guarda la pregunta elegida en el perfil del usuario
        respuestaSeguridad: respuestaSeguridad.toLowerCase().trim(), // Almacena la respuesta normalizada a minúsculas sin espacios extras
      });

      this.security.resetRateLimit('register'); // Reinicia el contador del control de tasa de intentos exitosos
      await loading.dismiss(); // Cierra el modal de carga
      await this.showSuccess(); // Muestra el mensaje de éxito de creación de cuenta
      this.router.navigateByUrl('/tabs/home', { replaceUrl: true }); // Redirige al inicio reemplazando el historial para no poder regresar

    } catch (error: any) {
      await loading.dismiss(); // Cierra el spinner en caso de excepción
      await this.showError(error.code); // Muestra el mensaje de error parseando el código devuelto
    }
  }

  // =========================
  // ✅ Terminos y condiciones
  // =========================
  async onVerTerminos() {
    const modal = await this.modalCtrl.create({
      component: TerminosModalComponent, // Asigna el componente modal a presentar
      breakpoints: [0, 1], // Configura los puntos de ajuste de la hoja desplegable
      initialBreakpoint: 1, // Define que abra a pantalla completa inicialmente
      cssClass: 'terminos-modal' // Aplica la clase CSS personalizada definida
    });

    await modal.present(); // Presenta el modal en pantalla

    const { data } = await modal.onDidDismiss(); // Espera a que el modal se cierre y recupera los datos devueltos

    if (data?.aceptado) { // Si el objeto retornado indica que fueron aceptados los términos
      this.registerForm.patchValue({
        terminos: true // Actualiza el campo 'terminos' del formulario reactivo a true
      });
    }
  }


  // =========================
  // ✅ ÉXITO
  // =========================
  private async showSuccess() {
    const alert = await this.alertCtrl.create({
      header: '¡Cuenta creada!', // Título de la alerta de confirmación
      message: 'Tu cuenta fue creada exitosamente.', // Mensaje descriptivo de éxito
      buttons: ['Continuar'], // Botón de confirmación de la alerta
    });
    await alert.present(); // Muestra la alerta de éxito
    await alert.onDidDismiss(); // Espera a que el usuario presione el botón y cierre la alerta
  }

  // =========================
  // ❌ ERRORES
  // =========================
  private async showError(errorCode: string) {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Este correo ya está registrado.', // Mapeo de error cuando el email ya existe
      'auth/invalid-email': 'El correo no es válido.', // Mapeo de error cuando el correo es rechazado por el backend
      'auth/weak-password': 'La contraseña es muy débil.', // Mapeo de error por debilidad de contraseña
      'terminos-no-aceptados': 'Debes aceptar los términos y condiciones para registrarte.', // Mapeo de error de verificación de términos
    };

    const message = messages[errorCode] || errorCode; // Asigna el mensaje traducido o el texto plano si no coincide con las claves

    const alert = await this.alertCtrl.create({
      header: 'Error al registrarse', // Título de la alerta de error
      message, // Mensaje procesado a mostrar
      buttons: ['Aceptar'], // Botón para cerrar la alerta
    });
    await alert.present(); // Presenta la alerta en pantalla
  }

  // =========================
  // 🔙 NAVEGACIÓN
  // =========================
  goToLogin() {
    this.router.navigateByUrl('/login'); // Redirige a la vista de inicio de sesión
  }
}