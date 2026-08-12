// =========================
// 🔹 IMPORTACIONES
// =========================
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';

import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';
import { Lugar } from 'src/app/core/models/evento.model';

@Component({
  selector: 'app-crear-evento',
  templateUrl: './crear-evento.page.html',
  styleUrls: ['./crear-evento.page.scss'],
  standalone: false,
})
export class CrearEventoPage implements OnInit {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService   = inject(AuthService);
  private security      = inject(SecurityService);
  private auth          = inject(Auth);
  private router        = inject(Router);
  private fb            = inject(FormBuilder);
  private toastCtrl     = inject(ToastController);
  private loadingCtrl   = inject(LoadingController);

  // =========================
  // 📊 ESTADO
  // =========================
  hideHeader = false;
  lastScrollTop = 0;

  lugares$: Observable<Lugar[]> = this.eventoService.getLugares();
  lugarSeleccionado: Lugar | null = null;

  // ✅ Fecha mínima = hoy (no permite fechas pasadas)
  fechaMinima = new Date().toISOString();
  fechaSeleccionada = '';
  horaSeleccionada  = '';

  // =========================
  // 📋 FORMULARIO
  // =========================
  eventoForm: FormGroup = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    fecha:       ['', [Validators.required]],
    hora:        ['', [Validators.required]],
    lugarId:     ['', [Validators.required]],
  });

  get nombre()      { return this.eventoForm.get('nombre'); }
  get descripcion() { return this.eventoForm.get('descripcion'); }
  get fecha()       { return this.eventoForm.get('fecha'); }
  get hora()        { return this.eventoForm.get('hora'); }
  get lugarId()     { return this.eventoForm.get('lugarId'); }

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    // ✅ Verificar autenticación al cargar
    if (!this.auth.currentUser) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
  }

  // =========================
  // 📅 MANEJO DE FECHA
  // =========================
  onFechaChange(event: any) {
    const valor = event.detail.value;
    if (!valor) return;

    // ✅ Validar que la fecha no sea en el pasado
    const fechaSeleccionada = new Date(valor);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) {
      this.showToast('La fecha no puede ser en el pasado', 'warning');
      this.eventoForm.patchValue({ fecha: '' });
      this.fechaSeleccionada = '';
      return;
    }

    this.fechaSeleccionada = fechaSeleccionada.toLocaleDateString('es-CL');
    this.eventoForm.patchValue({ fecha: valor });
  }

  // =========================
  // ⏰ MANEJO DE HORA
  // =========================
  onHoraChange(event: any) {
    const valor = event.detail.value;
    if (!valor) return;

    const hora = new Date(valor);
    this.horaSeleccionada = hora.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.eventoForm.patchValue({ hora: this.horaSeleccionada });
  }

  // =========================
  // 📍 SELECCIÓN DE LUGAR
  // =========================
  onLugarChange(event: any, lugares: Lugar[]) {
    const id = event.detail.value;

    // ✅ Validar que el lugar existe en la lista
    const lugar = lugares.find(l => l.id === id) || null;

    if (!lugar) {
      this.showToast('Lugar no válido', 'warning');
      this.eventoForm.patchValue({ lugarId: '' });
      this.lugarSeleccionado = null;
      return;
    }

    this.lugarSeleccionado = lugar;
    this.eventoForm.patchValue({ lugarId: id });
  }

  // =========================
  // 🚀 CREAR EVENTO
  // =========================
  async onCrearEvento(lugares: Lugar[]) {
    if (this.eventoForm.invalid) {
      this.eventoForm.markAllAsTouched();
      return;
    }

    // ✅ Verificar sesión activa
    if (!this.auth.currentUser) {
      await this.showToast('Tu sesión ha expirado. Inicia sesión nuevamente.', 'danger');
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    const { nombre, descripcion, fecha, hora, lugarId } = this.eventoForm.value;

    // ✅ Validar XSS en nombre
    if (!this.security.isSafeText(nombre, 100)) {
      await this.showToast('El nombre contiene caracteres no permitidos', 'warning');
      return;
    }

    // ✅ Validar XSS en descripción
    if (!this.security.isSafeText(descripcion, 500)) {
      await this.showToast('La descripción contiene caracteres no permitidos', 'warning');
      return;
    }

    // ✅ Validar fecha no en el pasado
    const fechaEvento = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaEvento < hoy) {
      await this.showToast('La fecha no puede ser en el pasado', 'warning');
      return;
    }

    // ✅ Validar que el lugar existe
    const lugar = lugares.find(l => l.id === lugarId);
    if (!lugar) {
      await this.showToast('Selecciona un lugar válido', 'warning');
      return;
    }

    // ✅ Rate limiting: máx 5 eventos por hora
    if (!this.security.checkRateLimit('crear-evento', 5, 3600000)) {
      await this.showToast('Has creado demasiados eventos. Espera un momento.', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando evento...' });
    await loading.present();

    try {
      const userData = await this.authService.getCurrentUserData();

      // ✅ Sanitizar nombre y descripción antes de guardar
      const nombreSeguro      = this.security.sanitizeInput(nombre.trim());
      const descripcionSegura = this.security.sanitizeInput(descripcion.trim());

      await this.eventoService.crearEvento({
        nombre:      nombreSeguro,
        descripcion: descripcionSegura,
        fecha:       new Date(fecha),
        hora,
        lugarId,
        lugar: {
          id:                    lugar.id,
          nombre:                lugar.nombre,
          informacion:           lugar.informacion,
          altitud:               lugar.altitud,
          dificultad:            lugar.dificultad,
          distanciaKm:           lugar.distanciaKm,
          tiempoEstimadoHoras:   lugar.tiempoEstimadoHoras,
          equipamiento:          lugar.equipamiento,
          DireccionPuntoInicio:  lugar.DireccionPuntoInicio,
          latitud:               lugar.latitud  ?? null,
          longitud:              lugar.longitud ?? null,
          requiereRegistroAcceso: lugar.requiereRegistroAcceso,
          requiereGuiaMontana:   lugar.requiereGuiaMontana,
          requierePagoEntrada:   lugar.requierePagoEntrada,
          valorEntrada:          lugar.requierePagoEntrada ? lugar.valorEntrada : null,
          requiereMasInformacion: lugar.requiereMasInformacion,
          MasInformacion:        lugar.requiereMasInformacion ? lugar.MasInformacion : null,
          requiereHorarioVisita: lugar.requiereHorarioVisita,
          horarioVisita:         lugar.requiereHorarioVisita ? lugar.horarioVisita : null,
          requierePermiso:       lugar.requierePermiso,
          mapaRutaUrl:           lugar.mapaRutaUrl || '',
        },
        creadoPor: {
          uid:    userData!.uid,
          nombre: userData!.nombre,
        },
        privado: true,
      });

      this.security.resetRateLimit('crear-evento');
      await loading.dismiss();
      await this.showToast('¡Evento creado exitosamente!', 'success');
      this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });

    } catch (error) {
      await loading.dismiss();
      await this.showToast('Error al crear el evento', 'danger');
    }
  }

  // =========================
  // 🔙 NAVEGACIÓN
  // =========================
  goBack() {
    this.router.navigateByUrl('/tabs/eventos');
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // =========================
  // 📜 SCROLL
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }
}