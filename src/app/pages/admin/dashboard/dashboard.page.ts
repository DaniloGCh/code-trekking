// src/app/pages/admin/dashboard/dashboard.page.ts

// 🔹 Importaciones principales de Angular
import { Component, OnInit, inject } from '@angular/core';

// 🔹 Router para navegación entre páginas
import { Router } from '@angular/router';

// 🔹 Controladores de Ionic para alertas y notificaciones
import { AlertController, ToastController } from '@ionic/angular';

// 🔹 Servicio de autenticación y modelo de usuario
import { AuthService, UserData } from 'src/app/core/services/auth.service';

// 🔹 Observable para manejar datos reactivos
import { Observable } from 'rxjs';

// 🔹 Servicios personalizados (clima y hora)
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LugarService } from 'src/app/core/services/lugar.service';
import { Lugar } from 'src/app/core/models/evento.model';

import { LoadingController } from '@ionic/angular';
@Component({
  selector: 'app-dashboard', // Nombre del componente
  templateUrl: './dashboard.page.html', // HTML asociado
  styleUrls: ['./dashboard.page.scss'], // Estilos
  standalone: false,
})
export class DashboardPage implements OnInit {

  // 🔹 Inyección de servicios
   private authService = inject(AuthService);
  private lugarService = inject(LugarService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private fb = inject(FormBuilder);


  // =========================
  // 📜 CONTROL DE SCROLL HEADER
  // =========================
  hideHeader = false; // Indica si el header se oculta
  lastScrollTop = 0;  // Guarda la última posición del scroll

  // =========================
  // 👤 DATOS DEL ADMIN
  // =========================
  adminData: UserData | null = null; // Información del admin actual

  // =========================
  // 👥 LISTA DE USUARIOS
  // =========================
  users$: Observable<UserData[]> = this.authService.getAllUsers(); 
  // Observable que obtiene todos los usuarios desde Firestore

  // =========================
  // 📊 ESTADÍSTICAS
  // =========================
  totalUsers = 0;       // Total de usuarios
  totalAdmins = 0;      // Total de administradores
  totalRegulares = 0;   // Total de usuarios normales

    // 📍 Lugares
  lugares$: Observable<Lugar[]> = this.lugarService.getLugares();
  mostrarFormLugar = false;
  lugarEditando: Lugar | null = null;

// 📋 Formulario de lugar completo
lugarForm: FormGroup = this.fb.group({
  nombre:               ['', [Validators.required, Validators.minLength(3)]],
  informacion:          ['', [Validators.required, Validators.minLength(10)]],
  altitud:              ['', [Validators.required, Validators.min(0)]],
  dificultad:           ['', [Validators.required]],
  distanciaKm:          ['', [Validators.required, Validators.min(0.1)]],
  tiempoEstimadoHoras:  ['', [Validators.required, Validators.min(0.5)]],
  temporada:            ['', [Validators.required]],
  equipamiento:         [[], [Validators.required]],
  puntoInicio:          ['', [Validators.required, Validators.minLength(3)]],
  requierePermiso:      [false],
  calificacionRiesgo:   ['', [Validators.required]],
});

// ✅ Getters nuevos
// ✅ Getters con prefijo 'f' para evitar conflictos
get fNombre()              { return this.lugarForm.get('nombre'); }
get fInformacion()         { return this.lugarForm.get('informacion'); }
get fAltitud()             { return this.lugarForm.get('altitud'); }
get fDificultad()          { return this.lugarForm.get('dificultad'); }
get fDistanciaKm()         { return this.lugarForm.get('distanciaKm'); }
get fTiempoEstimadoHoras() { return this.lugarForm.get('tiempoEstimadoHoras'); }
get fTemporada()           { return this.lugarForm.get('temporada'); }
get fEquipamiento()        { return this.lugarForm.get('equipamiento'); }
get fPuntoInicio()         { return this.lugarForm.get('puntoInicio'); }
get fRequierePermiso()     { return this.lugarForm.get('requierePermiso'); }
get fCalificacionRiesgo()  { return this.lugarForm.get('calificacionRiesgo'); }

// ✅ Opciones de equipamiento disponibles
equipamientoOpciones = [
  'Bastones de trekking',
  'Crampones',
  'Piolet',
  'Casco',
  'Arnés',
  'Linterna frontal',
  'Kit primeros auxilios',
  'Ropa térmica',
  'Impermeables',
  'Agua extra (3L+)',
  'Comida de emergencia',
  'GPS o mapa',
];


  // 🔹 Inyección en constructor (para usar en el HTML directamente)
  constructor(
    public weatherGlobal: WeatherGlobalService, // Clima global
    public timeService: TimeService             // Hora en tiempo real
  ) { }

  // =========================
  // 🚀 INICIALIZACIÓN
  // =========================
  async ngOnInit() {

    // Obtener datos del admin logueado
    this.adminData = await this.authService.getCurrentUserData();

    // Suscribirse a la lista de usuarios para calcular estadísticas
    this.users$.subscribe(users => {

      // Total de usuarios
      this.totalUsers = users.length;

      // Contar administradores
      this.totalAdmins = users.filter(u => u.rol === 'admin').length;

      // Contar usuarios normales
      this.totalRegulares = users.filter(u => u.rol === 'user').length;
    });
  }

  // ➕ MOSTRAR FORMULARIO NUEVO LUGAR
  onNuevoLugar() {
    this.lugarEditando = null;
    this.lugarForm.reset();
    this.mostrarFormLugar = true;
  }

  // ✏️ EDITAR LUGAR
  onEditarLugar(lugar: Lugar) {
  this.lugarEditando = lugar;
  this.lugarForm.patchValue({
    nombre:              lugar.nombre,
    informacion:         lugar.informacion,
    altitud:             lugar.altitud,
    dificultad:          lugar.dificultad,
    distanciaKm:         lugar.distanciaKm,
    tiempoEstimadoHoras: lugar.tiempoEstimadoHoras,
    temporada:           lugar.temporada,
    equipamiento:        lugar.equipamiento,
    puntoInicio:         lugar.puntoInicio,
    requierePermiso:     lugar.requierePermiso,
    calificacionRiesgo:  lugar.calificacionRiesgo,
  });
  this.mostrarFormLugar = true;
  setTimeout(() => {
    document.getElementById('form-lugar')?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

  // 💾 GUARDAR LUGAR (agregar o editar)
async onGuardarLugar() {
  if (this.lugarForm.invalid) {
    this.lugarForm.markAllAsTouched();
    return;
  }

  const loading = await this.loadingCtrl.create({
    message: this.lugarEditando ? 'Actualizando lugar...' : 'Agregando lugar...'
  });
  await loading.present();

  try {
    const datos: Omit<Lugar, 'id'> = {
      nombre:              this.lugarForm.value.nombre.trim(),
      informacion:         this.lugarForm.value.informacion.trim(),
      altitud:             Number(this.lugarForm.value.altitud),
      dificultad:          this.lugarForm.value.dificultad,
      distanciaKm:         Number(this.lugarForm.value.distanciaKm),
      tiempoEstimadoHoras: Number(this.lugarForm.value.tiempoEstimadoHoras),
      temporada:           this.lugarForm.value.temporada,
      equipamiento:        this.lugarForm.value.equipamiento,
      puntoInicio:         this.lugarForm.value.puntoInicio.trim(),
      requierePermiso:     this.lugarForm.value.requierePermiso,
      calificacionRiesgo:  this.lugarForm.value.calificacionRiesgo,
    };

    if (this.lugarEditando) {
      await this.lugarService.editarLugar(this.lugarEditando.id!, datos);
      
      await this.showToast('Lugar actualizado correctamente', 'success');
    } else {
      await this.lugarService.agregarLugar(datos);
      await this.showToast('Lugar agregado correctamente', 'success');
    }

    this.onCancelarForm();
  } catch (error) {
    await this.showToast('Error al guardar el lugar', 'danger');
  } finally {
    await loading.dismiss();
  }
}

  // ❌ CANCELAR FORMULARIO
  onCancelarForm() {
    this.mostrarFormLugar = false;
    this.lugarEditando = null;
    this.lugarForm.reset();
  }

  // 🗑️ ELIMINAR LUGAR
  async onEliminarLugar(lugar: Lugar) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar lugar',
      message: `¿Estás seguro que deseas eliminar <strong>${lugar.nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();
            try {
              await this.lugarService.eliminarLugar(lugar.id!);
              await this.showToast('Lugar eliminado', 'success');
            } catch (error) {
              await this.showToast('Error al eliminar el lugar', 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // =========================
  // 🔄 CAMBIAR ROL DE USUARIO
  // =========================
  async onChangeRole(user: UserData) {

    // Alterna el rol entre admin y user
    const nuevoRol = user.rol === 'admin' ? 'user' : 'admin';

    // Texto amigable del rol
    const rolLabel = nuevoRol === 'admin' ? 'Administrador' : 'Usuario';

    // Crear alerta de confirmación
    const alert = await this.alertCtrl.create({
      header: 'Cambiar rol',
      message: `¿Cambiar el rol de ${user.nombre} a ${rolLabel}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' }, // Botón cancelar
        {
          text: 'Confirmar',
          handler: async () => {
            try {

              // Actualiza el rol en Firestore
              await this.authService.updateUserRole(user.uid, nuevoRol);

              // Mostrar mensaje de éxito
              await this.showToast(`Rol de ${user.nombre} actualizado a ${rolLabel}`);

            } catch (error) {

              // Mostrar error
              await this.showToast('Error al actualizar el rol', 'danger');
            }
          }
        }
      ]
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // 🚪 CERRAR SESIÓN
  // =========================
  async onLogout() {

    // Alerta de confirmación
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' }, // Cancelar
        {
          text: 'Cerrar sesión',
          handler: async () => {

            // Cerrar sesión
            await this.authService.logout();

            // Redirigir al login
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // 🍞 TOAST (NOTIFICACIONES)
  // =========================
  private async showToast(message: string, color: string = 'success') {

    // Crear toast
    const toast = await this.toastCtrl.create({
      message,        // Mensaje a mostrar
      duration: 2500, // Duración en ms
      color,          // Color (success, danger, etc.)
      position: 'bottom' // Posición en pantalla
    });

    // Mostrar toast
    await toast.present();
  }

  // =========================
  // 🏠 IR AL HOME
  // =========================
  goHome() {

    // Navega a la página principal
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }

  // =========================
  // 📜 CONTROL DE SCROLL
  // =========================
  onScroll(event: any) {

    // Obtener posición actual del scroll
    const scrollTop = event.detail.scrollTop;

    // Si el usuario baja → ocultar header
    if (scrollTop > this.lastScrollTop && scrollTop > 50) {
      this.hideHeader = true;
    } else {

      // Si sube → mostrar header
      this.hideHeader = false;
    }

    // Guardar última posición
    this.lastScrollTop = scrollTop;
  }

  // =========================
  // 🌤️ ABRIR CLIMA EN GOOGLE
  // =========================
  openWeatherLink() {

    // Abre una nueva pestaña con el clima de Santiago
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
  }
}