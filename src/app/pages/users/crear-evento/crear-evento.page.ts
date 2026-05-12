// =========================
// 🔹 IMPORTACIONES
// =========================
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';

// Servicios
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';

// Modelos
import { Lugar } from 'src/app/core/models/evento.model';

@Component({
  selector: 'app-crear-evento',
  templateUrl: './crear-evento.page.html',
  styleUrls: ['./crear-evento.page.scss'],
  standalone: false,
})
export class CrearEventoPage implements OnInit {

  // =========================
  // 🔹 INYECCIÓN DE DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // =========================
  // 📜 CONTROL DE HEADER (SCROLL)
  // =========================
  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 📍 LUGARES
  // =========================
  lugares$: Observable<Lugar[]> = this.eventoService.getLugares();
  lugarSeleccionado: Lugar | null = null;

  // =========================
  // 📅 FECHA MÍNIMA
  // =========================
  fechaMinima = new Date().toISOString();

  // =========================
  // 📋 FORMULARIO
  // =========================
  eventoForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]],
    lugarId: ['', [Validators.required]],
  });

  // =========================
  // ✅ GETTERS
  // =========================
  get nombre() { return this.eventoForm.get('nombre'); }
  get descripcion() { return this.eventoForm.get('descripcion'); }
  get fecha() { return this.eventoForm.get('fecha'); }
  get hora() { return this.eventoForm.get('hora'); }
  get lugarId() { return this.eventoForm.get('lugarId'); }

  // =========================
  // 🕒 VALORES MOSTRADOS
  // =========================
  fechaSeleccionada: string = '';
  horaSeleccionada: string = '';

  async ngOnInit() { }

  // =========================
  // 📅 MANEJO DE FECHA
  // =========================
  onFechaChange(event: any) {
    const valor = event.detail.value;

    if (valor) {
      const fecha = new Date(valor);
      this.fechaSeleccionada = fecha.toLocaleDateString('es-CL');
      this.eventoForm.patchValue({ fecha: valor });
    }
  }

  // =========================
  // ⏰ MANEJO DE HORA
  // =========================
  onHoraChange(event: any) {
    const valor = event.detail.value;

    if (valor) {
      const hora = new Date(valor);

      this.horaSeleccionada = hora.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      });

      this.eventoForm.patchValue({ hora: this.horaSeleccionada });
    }
  }

  // =========================
  // 📍 SELECCIÓN DE LUGAR
  // =========================
  onLugarChange(event: any, lugares: Lugar[]) {
    const id = event.detail.value;

    this.lugarSeleccionado =
      lugares.find((l) => l.id === id) || null;

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

    const loading = await this.loadingCtrl.create({
      message: 'Creando evento...',
    });

    await loading.present();

    try {
      const userData = await this.authService.getCurrentUserData();
      const { nombre, descripcion, fecha, hora, lugarId } =
        this.eventoForm.value;

      const lugar = lugares.find((l) => l.id === lugarId)!;

      await this.eventoService.crearEvento({
        nombre,
        descripcion,
        fecha: new Date(fecha),
        hora,
        lugarId,

        // 🔥 AQUÍ ESTÁ LA CLAVE
        lugar: {
          id: lugar.id,
          nombre: lugar.nombre,
          informacion: lugar.informacion,
          altitud: lugar.altitud,
          dificultad: lugar.dificultad,
          distanciaKm: lugar.distanciaKm,
          tiempoEstimadoHoras: lugar.tiempoEstimadoHoras,
          equipamiento: lugar.equipamiento,
          DireccionPuntoInicio: lugar.DireccionPuntoInicio,
          latitud: lugar.latitud ?? null,           // ✅ null en vez de undefined
          longitud: lugar.longitud ?? null,          // ✅ null en vez de undefined

          requiereRegistroAcceso: lugar.requiereRegistroAcceso,
          requiereGuiaMontana: lugar.requiereGuiaMontana,
          requierePagoEntrada: lugar.requierePagoEntrada,
          valorEntrada: lugar.requierePagoEntrada    // ✅ null si no requiere pago
            ? lugar.valorEntrada
            : null,

          requiereMasInformacion: lugar.requiereMasInformacion,
          MasInformacion: lugar.requiereMasInformacion
            ? lugar.MasInformacion
            : null,                                  // ✅ null en vez de undefined

          requiereHorarioVisita: lugar.requiereHorarioVisita,
          horarioVisita: lugar.requiereHorarioVisita
            ? lugar.horarioVisita
            : null,                                  // ✅ null en vez de undefined

          requierePermiso: lugar.requierePermiso,
          mapaRutaUrl: lugar.mapaRutaUrl || '',
        },

        creadoPor: {
          uid: userData!.uid,
          nombre: userData!.nombre,
        },

        privado: true,
      });

      await loading.dismiss();

      await this.showToast('¡Evento creado exitosamente!', 'success');

      this.router.navigateByUrl('/tabs/eventos', {
        replaceUrl: true,
      });

    } catch (error) {
      await loading.dismiss();
      await this.showToast('Error al crear el evento', 'danger');
      // console.log(error);

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
  private async showToast(
    message: string,
    color: string = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });

    await toast.present();
  }

  // =========================
  // 📜 SCROLL HEADER
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    if (scrollTop > this.lastScrollTop && scrollTop > 50) {
      this.hideHeader = true;
    } else {
      this.hideHeader = false;
    }

    this.lastScrollTop = scrollTop;
  }
}