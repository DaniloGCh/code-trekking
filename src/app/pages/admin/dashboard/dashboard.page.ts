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

import { KitPrimerosAuxiliosService } from 'src/app/core/services/kit-primeros-auxilios.service';
import { KitSupervivenciaService } from 'src/app/core/services/kit-supervivencia.service';
import { KitPrimerosAuxilios, KitSupervivencia } from 'src/app/core/models/evento.model';

import { Evento } from 'src/app/core/models/evento.model';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

// ✅ Agrega este import
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ViewChild } from '@angular/core';
import { IonAccordionGroup } from '@ionic/angular';

import { Auth, EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';

import { SosService } from 'src/app/core/services/sos.service';
import { EventoService } from 'src/app/core/services/evento.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {

  // ✅ Inyecta Auth
  private auth = inject(Auth);

  // ✅ Referencia al accordion
  @ViewChild('accordionAdmin') accordionGroup?: IonAccordionGroup;
  @ViewChild('accordionUsuarios') accordionUsuarios?: IonAccordionGroup;

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
  private kitPAService = inject(KitPrimerosAuxiliosService);
  private kitSupService = inject(KitSupervivenciaService);
  private firestore = inject(Firestore);
  // ✅ Inyecta el sanitizer
  private sanitizer = inject(DomSanitizer);

  private sosService = inject(SosService);
  private eventoService = inject(EventoService);


  constructor(
    public weatherGlobal: WeatherGlobalService,
    public timeService: TimeService,


  ) { }

  temperature$ = this.weatherGlobal.temperature;
  description$ = this.weatherGlobal.description;
  locationName$ = this.weatherGlobal.locationName;
  icon$ = this.weatherGlobal.icon;
  humidity$ = this.weatherGlobal.humidity;
  windSpeed$ = this.weatherGlobal.windSpeed;

  safeMapaRutaUrl?: SafeResourceUrl;

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

  // 🔥 NUEVO: EVENTOS
  eventos$: Observable<Evento[]> = collectionData(
    collection(this.firestore, 'eventos'),
    { idField: 'id' }
  ) as Observable<Evento[]>;

  totalUsers = 0;
  totalAdmins = 0;
  totalRegulares = 0;

  totalEventos = 0;

  // 🔥 IMPORTANTE: índice string
  eventosPorUsuario: { [uid: string]: number } = {};



  // 📝 Consejos
  consejos$: Observable<Consejo[]> = this.consejoService.getConsejos();
  mostrarFormConsejo = false;
  consejoEditando: Consejo | null = null;

  consejoForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
  });


  // =========================
  // 🩺 KIT PRIMEROS AUXILIOS
  // =========================
  kitsPA$: Observable<KitPrimerosAuxilios[]> = this.kitPAService.getKits();
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
  kitsSup$: Observable<KitSupervivencia[]> = this.kitSupService.getKits();
  mostrarFormSup = false;
  supEditando: KitSupervivencia | null = null;

  supForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    items: ['', Validators.required],
    nivel: ['básico', Validators.required],
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
    altitud: ['', [Validators.required, Validators.minLength(3)]],
    dificultad: ['', [Validators.required]],
    distanciaKm: ['', [Validators.required, Validators.min(0.1)]],
    tiempoEstimadoHoras: ['', [Validators.required, Validators.minLength(3)]],
    equipamiento: [[], [Validators.required]],
    DireccionPuntoInicio: ['', [Validators.required, Validators.minLength(3)]],
    // 🆕 COORDENADAS
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
    mapaRutaUrl: [''] // 🔥 SOLO LA URL DEL EMBED

  });

  // ✅ Estado del panel admin
  panelDesbloqueado = false;

  // ✅ Estado del accordion de usuarios
  usuariosDesbloqueado = false;


  // =========================
  // 📌 GETTERS FORMULARIO
  // ========================= 
  get fNombre() { return this.lugarForm.get('nombre'); }
  get fInformacion() { return this.lugarForm.get('informacion'); }
  get fAltitud() { return this.lugarForm.get('altitud'); }
  get fDificultad() { return this.lugarForm.get('dificultad'); }
  get fDistanciaKm() { return this.lugarForm.get('distanciaKm'); }
  get fTiempoEstimadoHoras() { return this.lugarForm.get('tiempoEstimadoHoras'); }
  get fEquipamiento() { return this.lugarForm.get('equipamiento'); }
  get fDireccionPuntoInicio() {return this.lugarForm.get('DireccionPuntoInicio');}
  get fRequierePagoEntrada() { return this.lugarForm.get('requierePagoEntrada'); }
  get fRequierePermiso() { return this.lugarForm.get('requierePermiso'); }
  get fRequiereRegistroAcceso() { return this.lugarForm.get('requiereRegistroAcceso'); }
  get fRequiereGuiaMontana() { return this.lugarForm.get('requiereGuiaMontana') }
  get fRequiereHorarioVisita() { return this.lugarForm.get('requiereHorarioVisita'); }
  get fHorarioVisita() { return this.lugarForm.get('horarioVisita'); }
  get fRequiereMasInformacion() { return this.lugarForm.get('requiereMasInformacion'); }
  get fMasInformacion() { return this.lugarForm.get('MasInformacion'); }
  get fMapaRutaUrl() { return this.lugarForm.get('mapaRutaUrl'); }
  get cTitulo() { return this.consejoForm.get('titulo'); }
  get cDescripcion() { return this.consejoForm.get('descripcion'); }
  get mTitulo() { return this.manualForm.get('titulo'); }
  get mDescripcion() { return this.manualForm.get('descripcion'); }
  get mIcono() { return this.manualForm.get('icono'); }
  get mOrden() { return this.manualForm.get('orden'); }

  // 🩺 KIT PRIMEROS AUXILIOS
  get paNombre() { return this.paForm.get('nombre'); }
  get paDescripcion() { return this.paForm.get('descripcion'); }
  get paItems() { return this.paForm.get('items'); }

  // 🏕️ KIT SUPERVIVENCIA
  get supNombre() { return this.supForm.get('nombre'); }
  get supDescripcion() { return this.supForm.get('descripcion'); }
  get supItems() { return this.supForm.get('items'); }

  // =========================
  // 🎒 EQUIPAMIENTO
  // =========================
  equipamientoOpciones = [
    'Agua (2L a 3L)',
    'Snacks',
    'Comida',
    'Cocinilla portátil',
    'Kit de cocina',
    'Encendedor o fósforos',
    'Ropa de cambio',
    'Zapatillas comodas de cambio',
    'Esterilla o colchoneta',
    'Bolsa para basura',
    'Bastones de trekking',
    'Cuchillo (multiusos)',
    'Crampones',
    'Piolet',
    'Casco',
    'Arnés',
    'Linterna frontal',
    'Kit primeros auxilios',
    'Ropa térmica',
    'Impermeables',
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

    this.lugarForm.get('mapaRutaUrl')?.valueChanges.subscribe((url: string) => {

      if (url) {
        this.safeMapaRutaUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else {
        this.safeMapaRutaUrl = undefined;
      }

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


    // 🔥 CALCULAR EVENTOS
    this.eventos$.subscribe(eventos => {

      this.totalEventos = eventos.length;
      this.eventosPorUsuario = {};

      eventos.forEach(e => {

        // 👇 ASEGURAR QUE SEA STRING
        const uid = typeof e.creadoPor === 'string'
          ? e.creadoPor
          : e.creadoPor?.uid || 'desconocido';

        if (!this.eventosPorUsuario[uid]) {
          this.eventosPorUsuario[uid] = 0;
        }

        this.eventosPorUsuario[uid]++;
      });

    });
  }

  // 🔥 OBTENER CANTIDAD POR USUARIO
  getEventosPorUsuario(uid: string): number {
    return this.eventosPorUsuario[uid] || 0;
  }

  //------------------------
  //PRIMEROS AUXILIOS
  //------------------------
  onNuevoPA() {
    this.paEditando = null;
    this.paForm.reset();
    this.mostrarFormPA = true;
  }

  async guardarPA() {
    if (this.paForm.invalid) {
      this.paForm.markAllAsTouched();
      return;
    }

    const data = {
      ...this.paForm.value,
      items: this.paForm.value.items.split(',').map((i: string) => i.trim())
    };

    if (this.paEditando) {
      await this.kitPAService.editarKit(this.paEditando.id!, data);
    } else {
      await this.kitPAService.agregarKit(data);
    }

    this.onCancelarPA(); // 👈 importante
  }

  onCancelarPA() {
    this.mostrarFormPA = false;
    this.paEditando = null;
    this.paForm.reset();
  }

  editarPA(k: KitPrimerosAuxilios) {
    this.paEditando = k;
    this.paForm.patchValue({
      ...k,
      items: k.items.join(', ')
    });
    this.mostrarFormPA = true;
  }

  async eliminarPA(id: string) {
    await this.kitPAService.eliminarKit(id);
  }

  //------------------------
  //SUPERVIVENCIA
  //------------------------
  onNuevoSup() {
    this.supEditando = null;
    this.supForm.reset({ nivel: 'básico' });
    this.mostrarFormSup = true;
  }

  async guardarSup() {
    if (this.supForm.invalid) {
      this.supForm.markAllAsTouched();
      return;
    }

    const data = {
      ...this.supForm.value,
      items: this.supForm.value.items.split(',').map((i: string) => i.trim())
    };

    if (this.supEditando) {
      await this.kitSupService.editarKit(this.supEditando.id!, data);
    } else {
      await this.kitSupService.agregarKit(data);
    }

    this.onCancelarSup(); // 👈 importante
  }

  onCancelarSup() {
    this.mostrarFormSup = false;
    this.supEditando = null;
  }

  editarSup(k: KitSupervivencia) {
    this.supEditando = k;
    this.supForm.patchValue({
      ...k,
      items: k.items.join(', ')
    });
    this.mostrarFormSup = true;
  }

  async eliminarSup(id: string) {
    await this.kitSupService.eliminarKit(id);
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
      equipamiento: lugar.equipamiento,
      DireccionPuntoInicio: lugar.DireccionPuntoInicio || '',
      latitud: lugar.latitud || '',
      longitud: lugar.longitud || '',
      requiereRegistroAcceso: lugar.requiereRegistroAcceso,
      requiereGuiaMontana: lugar.requiereGuiaMontana,
      requierePagoEntrada: lugar.requierePagoEntrada,
      requiereHorarioVisita: lugar.requiereHorarioVisita,
      horarioVisita: {
        apertura: lugar.horarioVisita?.apertura || '',
        cierre: lugar.horarioVisita?.cierre || ''
      },
      requierePermiso: lugar.requierePermiso,

      requiereMasInformacion: lugar.requiereMasInformacion,
      MasInformacion: {
        Texto: lugar.MasInformacion?.Texto || '',
        URL: lugar.MasInformacion?.URL || '',
        Otro: lugar.MasInformacion?.Otro || ''
      },
      mapaRutaUrl: lugar.mapaRutaUrl || '', // 🔥 SOLO LA URL DEL EMBED

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
        altitud: this.lugarForm.value.altitud,
        dificultad: this.lugarForm.value.dificultad,
        distanciaKm: Number(this.lugarForm.value.distanciaKm),
        tiempoEstimadoHoras: this.lugarForm.value.tiempoEstimadoHoras,
        equipamiento: this.lugarForm.value.equipamiento,

        DireccionPuntoInicio: (this.lugarForm.value.DireccionPuntoInicio || '').trim(),

        // 🆕 COORDENADAS
        latitud: this.lugarForm.value.latitud ? Number(this.lugarForm.value.latitud) : undefined,
        longitud: this.lugarForm.value.longitud ? Number(this.lugarForm.value.longitud) : undefined,


        requierePagoEntrada: this.lugarForm.value.requierePagoEntrada,
        valorEntrada: this.lugarForm.value.requierePagoEntrada
          ? Number(this.lugarForm.value.valorEntrada || 0)
          : undefined,

        requierePermiso: this.lugarForm.value.requierePermiso,
        requiereRegistroAcceso: this.lugarForm.value.requiereRegistroAcceso,
        requiereGuiaMontana: this.lugarForm.value.requiereGuiaMontana,
        requiereHorarioVisita: this.lugarForm.value.requiereHorarioVisita,

        horarioVisita: this.lugarForm.value.requiereHorarioVisita
          ? {
            apertura: this.lugarForm.value.horarioVisita?.apertura || '',
            cierre: this.lugarForm.value.horarioVisita?.cierre || '',
          }
          : undefined,

        requiereMasInformacion: this.lugarForm.value.requiereMasInformacion,
        MasInformacion: this.lugarForm.value.requiereMasInformacion
          ? {
            Texto: this.lugarForm.value.MasInformacion?.Texto || '',
            URL: this.lugarForm.value.MasInformacion?.URL || '',
            Otro: this.lugarForm.value.MasInformacion?.Otro || '',
          }
          : undefined,
        mapaRutaUrl: this.lugarForm.value.mapaRutaUrl?.trim() || '',
      };

      if (!datos.requierePagoEntrada) {
        delete datos.valorEntrada;
      }

      if (!datos.requiereHorarioVisita) {
        delete datos.horarioVisita;
      }

      if (!datos.requiereMasInformacion) {
        delete datos.MasInformacion;
      }

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
  async openWeatherLink() {
    try {
      const ubicacion = await this.sosService.obtenerUbicacion();

      const url = `https://www.google.com/search?q=clima&near=${ubicacion.latitud},${ubicacion.longitud}`;

      window.open(url, '_blank');

    } catch (error) {
      console.error('Error obteniendo ubicación', error);

      // fallback si falla el GPS
      window.open('https://www.google.com/search?q=clima', '_blank');
    }
  }

  // ✅ Agrega este método
  // getSafeUrl(url: string): SafeResourceUrl {
  //   return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  // }

  // ✅ Verificar contraseña antes de abrir el panel
  async onAbrirPanel(event: any) {
    if (this.panelDesbloqueado) return;

    event.preventDefault();
    event.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: '🔐 Acceso restringido',
      message: 'Ingresa tu contraseña para acceder al panel de gestión',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Tu contraseña'
        }
      ],
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
              if (!currentUser || !currentUser.email) throw new Error('No autenticado');

              // ✅ Import estático, no dinámico
              const credential = EmailAuthProvider.credential(currentUser.email, data.password);
              await reauthenticateWithCredential(currentUser, credential);

              await loading.dismiss();
              this.panelDesbloqueado = true;

              // ✅ Abrir accordion manualmente
              if (this.accordionGroup) {
                this.accordionGroup.value = 'panel-admin';
              }

              await this.showToast('Acceso concedido', 'success');

            } catch (error: any) {
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

  // ✅ Solo bloquea si se cierra el accordion principal
  onCambioAccordion(event: any) {
    // ✅ Solo reacciona si el evento viene del accordion principal
    if (event.target.id !== 'accordion-admin-principal') return;

    const valorAbierto = event.detail.value;
    if (!valorAbierto || valorAbierto === '') {
      this.panelDesbloqueado = false;
    }
  }

  // ✅ Verificar contraseña antes de abrir usuarios
  async onAbrirUsuarios(event: any) {
    if (this.usuariosDesbloqueado) return;

    event.preventDefault();
    event.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: '🔐 Acceso restringido',
      message: 'Ingresa tu contraseña para ver los usuarios registrados',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Tu contraseña'
        }
      ],
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
              if (!currentUser || !currentUser.email) throw new Error('No autenticado');

              const credential = EmailAuthProvider.credential(currentUser.email, data.password);
              await reauthenticateWithCredential(currentUser, credential);

              await loading.dismiss();
              this.usuariosDesbloqueado = true;

              // ✅ Abrir accordion manualmente
              if (this.accordionUsuarios) {
                this.accordionUsuarios.value = 'usuarios';
              }

              await this.showToast('Acceso concedido', 'success');

            } catch (error: any) {
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

  // ✅ Bloquear cuando se cierra el accordion de usuarios
  onCambioAccordionUsuarios(event: any) {
    if (event.target.id !== 'accordion-usuarios-principal') return;

    const valorAbierto = event.detail.value;
    if (!valorAbierto || valorAbierto === '') {
      this.usuariosDesbloqueado = false;
    }
  }

}