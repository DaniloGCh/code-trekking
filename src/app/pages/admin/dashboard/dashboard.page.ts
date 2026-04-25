// src/app/pages/admin/dashboard/dashboard.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { Observable } from 'rxjs';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LugarService } from 'src/app/core/services/lugar.service';
import { Lugar } from 'src/app/core/models/evento.model';

import { ConsejoService } from 'src/app/core/services/consejo.service';
import { Consejo } from 'src/app/core/models/evento.model';

import { ManualService } from 'src/app/core/services/manual.service';
import { ManualPaso } from 'src/app/core/models/evento.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  // =========================
  // 🔹 SERVICIOS
  // =========================
  private authService = inject(AuthService);
  private lugarService = inject(LugarService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private fb = inject(FormBuilder);
  private consejoService = inject(ConsejoService);
  private manualService = inject(ManualService);

  constructor(
    public weatherGlobal: WeatherGlobalService,
    public timeService: TimeService
  ) { }

  // =========================
  // 📜 UI STATE
  // =========================
  hideHeader = false;
  lastScrollTop = 0;

  mostrarFormLugar = false;
  lugarEditando: Lugar | null = null;

  // =========================
  // 👤 USUARIO ADMIN
  // =========================
  adminData: UserData | null = null;

  // =========================
  // 👥 USUARIOS
  // =========================
  users$: Observable<UserData[]> = this.authService.getAllUsers();

  totalUsers = 0;
  totalAdmins = 0;
  totalRegulares = 0;

  // 📝 Consejos
  consejos$: Observable<Consejo[]> = this.consejoService.getConsejos();
  mostrarFormConsejo = false;
  consejoEditando: Consejo | null = null;

  consejoForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
  });


  // 📘 Manual de supervivencia
  manual$: Observable<ManualPaso[]> = this.manualService.getPasos();
  mostrarFormManual = false;
  manualEditando: ManualPaso | null = null;

  manualForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    icono: ['🧠', [Validators.required]],
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  // =========================
  // 📍 LUGARES
  // =========================
  lugares$: Observable<Lugar[]> = this.lugarService.getLugares();

  lugarForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    informacion: ['', [Validators.required, Validators.minLength(10)]],
    altitud: ['', [Validators.required, Validators.min(0)]],
    dificultad: ['', [Validators.required]],
    distanciaKm: ['', [Validators.required, Validators.min(0.1)]],
    tiempoEstimadoHoras: ['', [Validators.required, Validators.min(0.5)]],
    temporada: ['', [Validators.required]],
    equipamiento: [[], [Validators.required]],
    puntoInicio: ['', [Validators.required, Validators.minLength(3)]],
    requierePermiso: [false],
    calificacionRiesgo: ['', [Validators.required]],
  });

  // =========================
  // 📌 GETTERS FORMULARIO
  // =========================
  get fNombre() { return this.lugarForm.get('nombre'); }
  get fInformacion() { return this.lugarForm.get('informacion'); }
  get fAltitud() { return this.lugarForm.get('altitud'); }
  get fDificultad() { return this.lugarForm.get('dificultad'); }
  get fDistanciaKm() { return this.lugarForm.get('distanciaKm'); }
  get fTiempoEstimadoHoras() { return this.lugarForm.get('tiempoEstimadoHoras'); }
  get fTemporada() { return this.lugarForm.get('temporada'); }
  get fEquipamiento() { return this.lugarForm.get('equipamiento'); }
  get fPuntoInicio() { return this.lugarForm.get('puntoInicio'); }
  get fRequierePermiso() { return this.lugarForm.get('requierePermiso'); }
  get fCalificacionRiesgo() { return this.lugarForm.get('calificacionRiesgo'); }
  get cTitulo() { return this.consejoForm.get('titulo'); }
  get cDescripcion() { return this.consejoForm.get('descripcion'); }
  get mTitulo() { return this.manualForm.get('titulo'); }
  get mDescripcion() { return this.manualForm.get('descripcion'); }
  get mIcono() { return this.manualForm.get('icono'); }
  get mOrden() { return this.manualForm.get('orden'); }

  // =========================
  // 🎒 EQUIPAMIENTO
  // =========================
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

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {

    this.adminData = await this.authService.getCurrentUserData();

    this.users$.subscribe(users => {
      this.totalUsers = users.length;
      this.totalAdmins = users.filter(u => u.rol === 'admin').length;
      this.totalRegulares = users.filter(u => u.rol === 'user').length;
    });
  }

  // =========================
  // 📍MANUAL SUPERVIVENCIA
  // =========================
  onNuevoManual() {
    this.manualEditando = null;
    this.manualForm.reset({ icono: '🧠', orden: 1 });
    this.mostrarFormManual = true;

    setTimeout(() => {
      document.getElementById('form-manual')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  onEditarManual(paso: ManualPaso) {
    this.manualEditando = paso;

    this.manualForm.patchValue({
      titulo: paso.titulo,
      descripcion: paso.descripcion,
      icono: paso.icono,
      orden: paso.orden
    });

    this.mostrarFormManual = true;

    setTimeout(() => {
      document.getElementById('form-manual')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async onGuardarManual() {
    if (this.manualForm.invalid) {
      this.manualForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.manualEditando ? 'Actualizando paso...' : 'Agregando paso...'
    });

    await loading.present();

    try {
      const datos = {
        titulo: this.manualForm.value.titulo.trim(),
        descripcion: this.manualForm.value.descripcion.trim(),
        icono: this.manualForm.value.icono,
        orden: Number(this.manualForm.value.orden),
      };

      if (this.manualEditando) {
        await this.manualService.editarPaso(this.manualEditando.id!, datos);
        await this.showToast('Paso actualizado correctamente', 'success');
      } else {
        await this.manualService.agregarPaso(datos);
        await this.showToast('Paso agregado correctamente', 'success');
      }

      this.onCancelarFormManual();

    } catch (error) {
      await this.showToast('Error al guardar el paso', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  onCancelarFormManual() {
    this.mostrarFormManual = false;
    this.manualEditando = null;
    this.manualForm.reset({ icono: '🧠', orden: 1 });
  }

  async onEliminarManual(paso: ManualPaso) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar paso',
      message: `¿Eliminar <strong>${paso.titulo}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();

            try {
              await this.manualService.eliminarPaso(paso.id!);
              await this.showToast('Paso eliminado', 'success');
            } catch {
              await this.showToast('Error al eliminar', 'danger');
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
  // 📍 LUGARES CRUD
  // =========================
  onNuevoLugar() {
    this.lugarEditando = null;
    this.lugarForm.reset();
    this.mostrarFormLugar = true;
  }

  onEditarLugar(lugar: Lugar) {
    this.lugarEditando = lugar;

    this.lugarForm.patchValue({
      nombre: lugar.nombre,
      informacion: lugar.informacion,
      altitud: lugar.altitud,
      dificultad: lugar.dificultad,
      distanciaKm: lugar.distanciaKm,
      tiempoEstimadoHoras: lugar.tiempoEstimadoHoras,
      temporada: lugar.temporada,
      equipamiento: lugar.equipamiento,
      puntoInicio: lugar.puntoInicio,
      requierePermiso: lugar.requierePermiso,
      calificacionRiesgo: lugar.calificacionRiesgo,
    });

    this.mostrarFormLugar = true;

    setTimeout(() => {
      document.getElementById('form-lugar')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async onGuardarLugar() {
    if (this.lugarForm.invalid) {
      this.lugarForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.lugarEditando ? 'Actualizando...' : 'Agregando...'
    });

    await loading.present();

    try {
      const datos: Omit<Lugar, 'id'> = {
        nombre: this.lugarForm.value.nombre.trim(),
        informacion: this.lugarForm.value.informacion.trim(),
        altitud: Number(this.lugarForm.value.altitud),
        dificultad: this.lugarForm.value.dificultad,
        distanciaKm: Number(this.lugarForm.value.distanciaKm),
        tiempoEstimadoHoras: Number(this.lugarForm.value.tiempoEstimadoHoras),
        temporada: this.lugarForm.value.temporada,
        equipamiento: this.lugarForm.value.equipamiento,
        puntoInicio: this.lugarForm.value.puntoInicio.trim(),
        requierePermiso: this.lugarForm.value.requierePermiso,
        calificacionRiesgo: this.lugarForm.value.calificacionRiesgo,
      };

      if (this.lugarEditando) {
        await this.lugarService.editarLugar(this.lugarEditando.id!, datos);
        await this.showToast('Lugar actualizado', 'success');
      } else {
        await this.lugarService.agregarLugar(datos);
        await this.showToast('Lugar agregado', 'success');
      }

      this.onCancelarForm();

    } catch {
      await this.showToast('Error al guardar', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  onCancelarForm() {
    this.mostrarFormLugar = false;
    this.lugarEditando = null;
    this.lugarForm.reset();
  }

  async onEliminarLugar(lugar: Lugar) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar lugar',
      message: `¿Eliminar ${lugar.nombre}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();

            try {
              await this.lugarService.eliminarLugar(lugar.id!);
              await this.showToast('Eliminado', 'success');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // ➕ NUEVO CONSEJO
  onNuevoConsejo() {
    this.consejoEditando = null;
    this.consejoForm.reset();
    this.mostrarFormConsejo = true;
    setTimeout(() => {
      document.getElementById('form-consejo')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // ✏️ EDITAR CONSEJO
  onEditarConsejo(consejo: Consejo) {
    this.consejoEditando = consejo;
    this.consejoForm.patchValue({
      titulo: consejo.titulo,
      descripcion: consejo.descripcion,
    });
    this.mostrarFormConsejo = true;
    setTimeout(() => {
      document.getElementById('form-consejo')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // 💾 GUARDAR CONSEJO
  async onGuardarConsejo() {
    if (this.consejoForm.invalid) {
      this.consejoForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: this.consejoEditando ? 'Actualizando consejo...' : 'Agregando consejo...'
    });
    await loading.present();

    try {
      const datos = {
        titulo: this.consejoForm.value.titulo.trim(),
        descripcion: this.consejoForm.value.descripcion.trim(),
      };

      if (this.consejoEditando) {
        await this.consejoService.editarConsejo(this.consejoEditando.id!, datos);
        await this.showToast('Consejo actualizado correctamente', 'success');
      } else {
        await this.consejoService.agregarConsejo(datos);
        await this.showToast('Consejo agregado correctamente', 'success');
      }

      this.onCancelarFormConsejo();
    } catch (error) {
      await this.showToast('Error al guardar el consejo', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // ❌ CANCELAR FORMULARIO CONSEJO
  onCancelarFormConsejo() {
    this.mostrarFormConsejo = false;
    this.consejoEditando = null;
    this.consejoForm.reset();
  }

  // 🗑️ ELIMINAR CONSEJO
  async onEliminarConsejo(consejo: Consejo) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar consejo',
      message: `¿Estás seguro que deseas eliminar <strong>${consejo.titulo}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();
            try {
              await this.consejoService.eliminarConsejo(consejo.id!);
              await this.showToast('Consejo eliminado', 'success');
            } catch (error) {
              await this.showToast('Error al eliminar el consejo', 'danger');
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
  // 👥 USERS
  // =========================
  async onChangeRole(user: UserData) {

    const nuevoRol = user.rol === 'admin' ? 'user' : 'admin';

    const alert = await this.alertCtrl.create({
      header: 'Cambiar rol',
      message: `¿Cambiar a ${nuevoRol}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async () => {
            await this.authService.updateUserRole(user.uid, nuevoRol);
            await this.showToast('Rol actualizado');
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 🚪 LOGOUT
  // =========================
  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          handler: async () => {
            await this.authService.logout();
            this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });

    await toast.present();
  }

  // =========================
  // 🏠 NAV
  // =========================
  goHome() {
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }

  // =========================
  // 📜 SCROLL
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }

  // =========================
  // 🌤️ WEATHER
  // =========================
  openWeatherLink() {
    window.open('https://www.google.com/search?q=clima+santiago', '_blank');
  }
}