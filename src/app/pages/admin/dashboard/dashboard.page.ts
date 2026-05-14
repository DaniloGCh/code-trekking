import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, IonAccordionGroup } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Auth, EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';



import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { LugarService } from 'src/app/core/services/lugar.service';
import { ConsejoService } from 'src/app/core/services/consejo.service';
import { ManualService } from 'src/app/core/services/manual.service';
import { KitPrimerosAuxiliosService } from 'src/app/core/services/kit-primeros-auxilios.service';
import { KitSupervivenciaService } from 'src/app/core/services/kit-supervivencia.service';
import { SosService } from 'src/app/core/services/sos.service';
import { EventoService } from 'src/app/core/services/evento.service';
import { WeatherGlobalService } from 'src/app/core/services/weather-global.service';
import { TimeService } from 'src/app/core/services/time.service';

import {
  Lugar, Consejo, ManualPaso,
  KitPrimerosAuxilios, KitSupervivencia, Evento
} from 'src/app/core/models/evento.model';

import { SessionService } from 'src/app/core/services/session.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private lugarService = inject(LugarService);
  private consejoService = inject(ConsejoService);
  private manualService = inject(ManualService);
  private kitPAService = inject(KitPrimerosAuxiliosService);
  private kitSupService = inject(KitSupervivenciaService);
  private sosService = inject(SosService);
  private eventoService = inject(EventoService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private sessionService = inject(SessionService);

  @ViewChild('accordionAdmin') accordionGroup?: IonAccordionGroup;
  @ViewChild('accordionUsuarios') accordionUsuarios?: IonAccordionGroup;

  constructor(
    public weatherGlobal: WeatherGlobalService,
    public timeService: TimeService,
  ) { }

  // =========================
  // 📊 OBSERVABLES
  // =========================
  users$: Observable<UserData[]> = this.authService.getAllUsers();
  lugares$: Observable<Lugar[]> = this.lugarService.getLugares();
  consejos$: Observable<Consejo[]> = this.consejoService.getConsejos();
  manual$: Observable<ManualPaso[]> = this.manualService.getPasos();
  kitsPA$: Observable<KitPrimerosAuxilios[]> = this.kitPAService.getKits();
  kitsSup$: Observable<KitSupervivencia[]> = this.kitSupService.getKits();
  eventos$: Observable<Evento[]> = collectionData(
    collection(this.firestore, 'eventos'), { idField: 'id' }
  ) as Observable<Evento[]>;

  // =========================
  // 🌤️ WEATHER
  // =========================
  temperature$ = this.weatherGlobal.temperature;
  description$ = this.weatherGlobal.description;
  locationName$ = this.weatherGlobal.locationName;
  icon$ = this.weatherGlobal.icon;
  humidity$ = this.weatherGlobal.humidity;
  windSpeed$ = this.weatherGlobal.windSpeed;

  // =========================
  // 📊 ESTADO
  // =========================
  adminData: UserData | null = null;
  totalUsers = 0;
  totalAdmins = 0;
  totalRegulares = 0;
  totalEventos = 0;
  eventosPorUsuario: { [uid: string]: number } = {};

  hideHeader = false;
  lastScrollTop = 0;

  panelDesbloqueado = false;
  usuariosDesbloqueado = false;

  safeMapaRutaUrl?: SafeResourceUrl;

  // =========================
  // 📍 LUGARES
  // =========================
  mostrarFormLugar = false;
  lugarEditando: Lugar | null = null;

  lugarForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    informacion: ['', [Validators.required, Validators.minLength(10)]],
    altitud: ['', [Validators.required, Validators.minLength(3)]],
    dificultad: ['', [Validators.required]],
    distanciaKm: ['', [Validators.required, Validators.min(0.1)]],
    tiempoEstimadoHoras: ['', [Validators.required, Validators.minLength(3)]],
    equipamiento: [[], [Validators.required]],
    DireccionPuntoInicio: ['', [Validators.required, Validators.minLength(3)]],
    latitud: [''],
    longitud: [''],
    requiereRegistroAcceso: [false],
    requiereGuiaMontana: [false],
    requierePagoEntrada: [false],
    valorEntrada: [null],
    requiereHorarioVisita: [false],
    horarioVisita: this.fb.group({
      apertura: [''],
      cierre: ['']
    }),
    requierePermiso: [false],
    requiereMasInformacion: [false],
    MasInformacion: this.fb.group({
      Texto: [''],
      URL: [''],
      Otro: ['']
    }),
    mapaRutaUrl: ['']
  });

  // =========================
  // 📝 CONSEJOS
  // =========================
  mostrarFormConsejo = false;
  consejoEditando: Consejo | null = null;

  consejoForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
  });

  // =========================
  // 🩺 KIT PRIMEROS AUXILIOS
  // =========================
  mostrarFormPA = false;
  paEditando: KitPrimerosAuxilios | null = null;

  paForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    items: ['', Validators.required],
  });

  // =========================
  // 🏕️ KIT SUPERVIVENCIA
  // =========================
  mostrarFormSup = false;
  supEditando: KitSupervivencia | null = null;

  supForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    items: ['', Validators.required],
    nivel: ['básico', Validators.required],
  });

  // =========================
  // 📘 MANUAL SUPERVIVENCIA
  // =========================
  mostrarFormManual = false;
  manualEditando: ManualPaso | null = null;

  manualForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    icono: ['🧠', Validators.required],
    orden: [1, [Validators.required, Validators.min(1)]],
  });

  // =========================
  // 🎒 EQUIPAMIENTO
  // =========================
  equipamientoOpciones = [
    'Agua (2L a 3L)', 'Snacks', 'Comida', 'Cocinilla portátil',
    'Kit de cocina', 'Encendedor o fósforos', 'Ropa de cambio',
    'Zapatillas comodas de cambio', 'Esterilla o colchoneta',
    'Bolsa para basura', 'Bastones de trekking', 'Cuchillo (multiusos)',
    'Crampones', 'Piolet', 'Casco', 'Arnés', 'Linterna frontal',
    'Kit primeros auxilios', 'Ropa térmica', 'Impermeables',
    'Comida de emergencia', 'GPS o mapa',
  ];

  // =========================
  // 📌 GETTERS - LUGAR
  // =========================
  get fNombre() { return this.lugarForm.get('nombre'); }
  get fInformacion() { return this.lugarForm.get('informacion'); }
  get fAltitud() { return this.lugarForm.get('altitud'); }
  get fDificultad() { return this.lugarForm.get('dificultad'); }
  get fDistanciaKm() { return this.lugarForm.get('distanciaKm'); }
  get fTiempoEstimadoHoras() { return this.lugarForm.get('tiempoEstimadoHoras'); }
  get fEquipamiento() { return this.lugarForm.get('equipamiento'); }
  get fDireccionPuntoInicio() { return this.lugarForm.get('DireccionPuntoInicio'); }
  get fRequierePagoEntrada() { return this.lugarForm.get('requierePagoEntrada'); }
  get fRequierePermiso() { return this.lugarForm.get('requierePermiso'); }
  get fRequiereRegistroAcceso() { return this.lugarForm.get('requiereRegistroAcceso'); }
  get fRequiereGuiaMontana() { return this.lugarForm.get('requiereGuiaMontana'); }
  get fRequiereHorarioVisita() { return this.lugarForm.get('requiereHorarioVisita'); }
  get fHorarioVisita() { return this.lugarForm.get('horarioVisita'); }
  get fRequiereMasInformacion() { return this.lugarForm.get('requiereMasInformacion'); }
  get fMasInformacion() { return this.lugarForm.get('MasInformacion'); }
  get fMapaRutaUrl() { return this.lugarForm.get('mapaRutaUrl'); }

  // =========================
  // 📌 GETTERS - CONSEJO
  // =========================
  get cTitulo() { return this.consejoForm.get('titulo'); }
  get cDescripcion() { return this.consejoForm.get('descripcion'); }

  // =========================
  // 📌 GETTERS - MANUAL
  // =========================
  get mTitulo() { return this.manualForm.get('titulo'); }
  get mDescripcion() { return this.manualForm.get('descripcion'); }
  get mIcono() { return this.manualForm.get('icono'); }
  get mOrden() { return this.manualForm.get('orden'); }

  // =========================
  // 📌 GETTERS - KIT PA
  // =========================
  get paNombre() { return this.paForm.get('nombre'); }
  get paDescripcion() { return this.paForm.get('descripcion'); }
  get paItems() { return this.paForm.get('items'); }

  // =========================
  // 📌 GETTERS - KIT SUP
  // =========================
  get supNombre() { return this.supForm.get('nombre'); }
  get supDescripcion() { return this.supForm.get('descripcion'); }
  get supItems() { return this.supForm.get('items'); }

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    this.adminData = await this.authService.getCurrentUserData();

    // ✅ Verificar que es admin antes de iniciar timer
    if (this.adminData?.rol === 'admin') {
      this.sessionService.iniciarTimerAdmin();
    }

    this.users$.subscribe(users => {
      this.totalUsers = users.length;
      this.totalAdmins = users.filter(u => u.rol === 'admin').length;
      this.totalRegulares = users.filter(u => u.rol === 'user').length;
    });

    this.lugarForm.get('mapaRutaUrl')?.valueChanges.subscribe((url: string) => {
      this.safeMapaRutaUrl = url
        ? this.sanitizer.bypassSecurityTrustResourceUrl(url)
        : undefined;
    });

    this.lugarForm.get('requierePagoEntrada')?.valueChanges.subscribe((requiere: boolean) => {
      const control = this.lugarForm.get('valorEntrada');
      if (requiere) {
        control?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        control?.clearValidators();
        control?.setValue(null);
      }
      control?.updateValueAndValidity();
    });

    this.eventos$.subscribe(eventos => {
      this.totalEventos = eventos.length;
      this.eventosPorUsuario = {};
      eventos.forEach(e => {
        const uid = typeof e.creadoPor === 'string'
          ? e.creadoPor
          : e.creadoPor?.uid || 'desconocido';
        this.eventosPorUsuario[uid] = (this.eventosPorUsuario[uid] || 0) + 1;
      });
    });
  }

  // =========================
  // 🔢 HELPERS
  // =========================
  getEventosPorUsuario(uid: string): number {
    return this.eventosPorUsuario[uid] || 0;
  }

  private scrollToElement(id: string) {
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  private async confirmarEliminacion(mensaje: string, onConfirm: () => Promise<void>) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar',
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();
            try {
              await onConfirm();
              await this.showToast('Eliminado correctamente', 'success');
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

  private async verificarAcceso(onSuccess: () => void, mensaje: string) {
    const alert = await this.alertCtrl.create({
      header: '🔐 Acceso restringido',
      message: mensaje,
      inputs: [{ name: 'password', type: 'password', placeholder: 'Tu contraseña' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Acceder',
          handler: async (data) => {
            if (!data.password) {
              await this.showToast('Ingresa tu contraseña', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Verificando...' });
            await loading.present();

            try {
              const currentUser = this.auth.currentUser;
              if (!currentUser?.email) throw new Error('No autenticado');

              const credential = EmailAuthProvider.credential(currentUser.email, data.password);
              await reauthenticateWithCredential(currentUser, credential);

              await loading.dismiss();
              onSuccess();
              await this.showToast('Acceso concedido', 'success');
            } catch {
              await loading.dismiss();
              await this.showToast('Contraseña incorrecta', 'danger');
            }

            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // =========================
  // 🔐 ACCORDION ADMIN
  // =========================
  async onAbrirPanel(event: any) {
    if (this.panelDesbloqueado) return;
    event.preventDefault();
    event.stopPropagation();

    await this.verificarAcceso(
      () => {
        this.panelDesbloqueado = true;
        if (this.accordionGroup) this.accordionGroup.value = 'panel-admin';
      },
      'Ingresa tu contraseña para acceder al panel de gestión'
    );
  }

  onCambioAccordion(event: any) {
    if (event.target.id !== 'accordion-admin-principal') return;
    if (!event.detail.value) this.panelDesbloqueado = false;
  }

  // =========================
  // 🔐 ACCORDION USUARIOS
  // =========================
  async onAbrirUsuarios(event: any) {
    if (this.usuariosDesbloqueado) return;
    event.preventDefault();
    event.stopPropagation();

    await this.verificarAcceso(
      () => {
        this.usuariosDesbloqueado = true;
        if (this.accordionUsuarios) this.accordionUsuarios.value = 'usuarios';
      },
      'Ingresa tu contraseña para ver los usuarios registrados'
    );
  }

  onCambioAccordionUsuarios(event: any) {
    if (event.target.id !== 'accordion-usuarios-principal') return;
    if (!event.detail.value) this.usuariosDesbloqueado = false;
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
      ...lugar,
      DireccionPuntoInicio: lugar.DireccionPuntoInicio || '',
      latitud: lugar.latitud || '',
      longitud: lugar.longitud || '',
      horarioVisita: {
        apertura: lugar.horarioVisita?.apertura || '',
        cierre: lugar.horarioVisita?.cierre || ''
      },
      MasInformacion: {
        Texto: lugar.MasInformacion?.Texto || '',
        URL: lugar.MasInformacion?.URL || '',
        Otro: lugar.MasInformacion?.Otro || ''
      },
      mapaRutaUrl: lugar.mapaRutaUrl || '',
    });
    this.mostrarFormLugar = true;
    this.scrollToElement('form-lugar');
  }

  async onGuardarLugar() {
    if (this.lugarForm.invalid) { this.lugarForm.markAllAsTouched(); return; }

    const loading = await this.loadingCtrl.create({
      message: this.lugarEditando ? 'Actualizando...' : 'Agregando...'
    });
    await loading.present();

    try {
      const v = this.lugarForm.value;
      const datos: Omit<Lugar, 'id'> = {
        nombre: v.nombre.trim(),
        informacion: v.informacion.trim(),
        altitud: v.altitud,
        dificultad: v.dificultad,
        distanciaKm: Number(v.distanciaKm),
        tiempoEstimadoHoras: v.tiempoEstimadoHoras,
        equipamiento: v.equipamiento,
        DireccionPuntoInicio: (v.DireccionPuntoInicio || '').trim(),
        latitud: v.latitud ? Number(v.latitud) : undefined,
        longitud: v.longitud ? Number(v.longitud) : undefined,
        requierePagoEntrada: v.requierePagoEntrada,
        valorEntrada: v.requierePagoEntrada ? Number(v.valorEntrada || 0) : undefined,
        requierePermiso: v.requierePermiso,
        requiereRegistroAcceso: v.requiereRegistroAcceso,
        requiereGuiaMontana: v.requiereGuiaMontana,
        requiereHorarioVisita: v.requiereHorarioVisita,
        horarioVisita: v.requiereHorarioVisita ? v.horarioVisita : undefined,
        requiereMasInformacion: v.requiereMasInformacion,
        MasInformacion: v.requiereMasInformacion ? v.MasInformacion : undefined,
        mapaRutaUrl: v.mapaRutaUrl?.trim() || '',
      };

      if (!datos.requierePagoEntrada) delete datos.valorEntrada;
      if (!datos.requiereHorarioVisita) delete datos.horarioVisita;
      if (!datos.requiereMasInformacion) delete datos.MasInformacion;

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
    await this.confirmarEliminacion(
      `¿Eliminar ${lugar.nombre}?`,
      () => this.lugarService.eliminarLugar(lugar.id!)
    );
  }

  // =========================
  // 📝 CONSEJOS CRUD
  // =========================
  onNuevoConsejo() {
    this.consejoEditando = null;
    this.consejoForm.reset();
    this.mostrarFormConsejo = true;
    this.scrollToElement('form-consejo');
  }

  onEditarConsejo(consejo: Consejo) {
    this.consejoEditando = consejo;
    this.consejoForm.patchValue({ titulo: consejo.titulo, descripcion: consejo.descripcion });
    this.mostrarFormConsejo = true;
    this.scrollToElement('form-consejo');
  }

  async onGuardarConsejo() {
    if (this.consejoForm.invalid) { this.consejoForm.markAllAsTouched(); return; }

    const loading = await this.loadingCtrl.create({
      message: this.consejoEditando ? 'Actualizando...' : 'Agregando...'
    });
    await loading.present();

    try {
      const datos = {
        titulo: this.consejoForm.value.titulo.trim(),
        descripcion: this.consejoForm.value.descripcion.trim(),
      };

      if (this.consejoEditando) {
        await this.consejoService.editarConsejo(this.consejoEditando.id!, datos);
      } else {
        await this.consejoService.agregarConsejo(datos);
      }

      await this.showToast(this.consejoEditando ? 'Consejo actualizado' : 'Consejo agregado', 'success');
      this.onCancelarFormConsejo();
    } catch {
      await this.showToast('Error al guardar el consejo', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  onCancelarFormConsejo() {
    this.mostrarFormConsejo = false;
    this.consejoEditando = null;
    this.consejoForm.reset();
  }

  async onEliminarConsejo(consejo: Consejo) {
    await this.confirmarEliminacion(
      `¿Eliminar ${consejo.titulo}?`,
      () => this.consejoService.eliminarConsejo(consejo.id!)
    );
  }

  // =========================
  // 🩺 KIT PRIMEROS AUXILIOS
  // =========================
  onNuevoPA() {
    this.paEditando = null;
    this.paForm.reset();
    this.mostrarFormPA = true;
  }

  editarPA(k: KitPrimerosAuxilios) {
    this.paEditando = k;
    this.paForm.patchValue({ ...k, items: k.items.join(', ') });
    this.mostrarFormPA = true;
  }

  async guardarPA() {
    if (this.paForm.invalid) { this.paForm.markAllAsTouched(); return; }
    const data = { ...this.paForm.value, items: this.paForm.value.items.split(',').map((i: string) => i.trim()) };
    if (this.paEditando) {
      await this.kitPAService.editarKit(this.paEditando.id!, data);
    } else {
      await this.kitPAService.agregarKit(data);
    }
    this.onCancelarPA();
  }

  onCancelarPA() {
    this.mostrarFormPA = false;
    this.paEditando = null;
    this.paForm.reset();
  }

  async eliminarPA(id: string) {
    await this.kitPAService.eliminarKit(id);
  }

  // =========================
  // 🏕️ KIT SUPERVIVENCIA
  // =========================
  onNuevoSup() {
    this.supEditando = null;
    this.supForm.reset({ nivel: 'básico' });
    this.mostrarFormSup = true;
  }

  editarSup(k: KitSupervivencia) {
    this.supEditando = k;
    this.supForm.patchValue({ ...k, items: k.items.join(', ') });
    this.mostrarFormSup = true;
  }

  async guardarSup() {
    if (this.supForm.invalid) { this.supForm.markAllAsTouched(); return; }
    const data = { ...this.supForm.value, items: this.supForm.value.items.split(',').map((i: string) => i.trim()) };
    if (this.supEditando) {
      await this.kitSupService.editarKit(this.supEditando.id!, data);
    } else {
      await this.kitSupService.agregarKit(data);
    }
    this.onCancelarSup();
  }

  onCancelarSup() {
    this.mostrarFormSup = false;
    this.supEditando = null;
  }

  async eliminarSup(id: string) {
    await this.kitSupService.eliminarKit(id);
  }

  // =========================
  // 📘 MANUAL SUPERVIVENCIA
  // =========================
  onNuevoManual() {
    this.manualEditando = null;
    this.manualForm.reset({ icono: '🧠', orden: 1 });
    this.mostrarFormManual = true;
    this.scrollToElement('form-manual');
  }

  onEditarManual(paso: ManualPaso) {
    this.manualEditando = paso;
    this.manualForm.patchValue({ titulo: paso.titulo, descripcion: paso.descripcion, icono: paso.icono, orden: paso.orden });
    this.mostrarFormManual = true;
    this.scrollToElement('form-manual');
  }

  async onGuardarManual() {
    if (this.manualForm.invalid) { this.manualForm.markAllAsTouched(); return; }

    const loading = await this.loadingCtrl.create({
      message: this.manualEditando ? 'Actualizando...' : 'Agregando...'
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
      } else {
        await this.manualService.agregarPaso(datos);
      }

      await this.showToast(this.manualEditando ? 'Paso actualizado' : 'Paso agregado', 'success');
      this.onCancelarFormManual();
    } catch {
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
    await this.confirmarEliminacion(
      `¿Eliminar ${paso.titulo}?`,
      () => this.manualService.eliminarPaso(paso.id!)
    );
  }

  // =========================
  // 👥 USUARIOS
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
            await this.showToast('Rol actualizado', 'success');
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
  // 🌤️ WEATHER
  // =========================
  async openWeatherLink() {
    try {
      const ubicacion = await this.sosService.obtenerUbicacion();
      window.open(`https://www.google.com/search?q=clima&near=${ubicacion.latitud},${ubicacion.longitud}`, '_blank');
    } catch {
      window.open('https://www.google.com/search?q=clima', '_blank');
    }
  }

  // =========================
  // 🏠 NAVEGACIÓN
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
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }

  // ✅ Detener timer al salir del dashboard
  ngOnDestroy() {
    this.sessionService.detenerTimer();
  }
}