// src/app/pages/users/crear-evento/crear-evento.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Lugar } from 'src/app/core/models/evento.model';

@Component({
  selector: 'app-crear-evento',
  templateUrl: './crear-evento.page.html',
  styleUrls: ['./crear-evento.page.scss'],
  standalone: false,
})
export class CrearEventoPage implements OnInit {

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // 📍 Lista de lugares desde Firestore
  lugares$: Observable<Lugar[]> = this.eventoService.getLugares();

  // 📍 Lugar seleccionado para mostrar su info
  lugarSeleccionado: Lugar | null = null;

  // 📅 Fecha mínima (hoy)
  fechaMinima = new Date().toISOString();

  // 📋 Formulario
eventoForm: FormGroup = this.fb.group({
  nombre:      ['', [Validators.required, Validators.minLength(3)]],
  descripcion: ['', [Validators.required, Validators.minLength(10)]],
  fecha:       ['', [Validators.required]],
  hora:        ['', [Validators.required]],
  lugarId:     ['', [Validators.required]],
});

  get nombre()      { return this.eventoForm.get('nombre'); }
  get descripcion() { return this.eventoForm.get('descripcion'); }
  get fecha()       { return this.eventoForm.get('fecha'); }
  get hora()        { return this.eventoForm.get('hora'); }
  get lugarId()     { return this.eventoForm.get('lugarId'); }


  // ✅ Para mostrar los valores seleccionados
fechaSeleccionada: string = '';
horaSeleccionada: string = '';


  async ngOnInit() {}

  // ✅ Capturar fecha seleccionada
onFechaChange(event: any) {
  const valor = event.detail.value;
  if (valor) {
    const fecha = new Date(valor);
    this.fechaSeleccionada = fecha.toLocaleDateString('es-CL');
    this.eventoForm.patchValue({ fecha: valor });
  }
}

// ✅ Capturar hora seleccionada
onHoraChange(event: any) {
  const valor = event.detail.value;
  if (valor) {
    const hora = new Date(valor);
    this.horaSeleccionada = hora.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    this.eventoForm.patchValue({ hora: this.horaSeleccionada });
  }
}
  // 📍 Cuando selecciona un lugar mostrar su info
  onLugarChange(event: any, lugares: Lugar[]) {
    const id = event.detail.value;
    this.lugarSeleccionado = lugares.find(l => l.id === id) || null;
    this.eventoForm.patchValue({ lugarId: id });
  }

  // 🚀 CREAR EVENTO
  async onCrearEvento(lugares: Lugar[]) {
    if (this.eventoForm.invalid) {
      this.eventoForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando evento...' });
    await loading.present();

    try {
      const userData = await this.authService.getCurrentUserData();
      const { nombre, descripcion, fecha, hora, lugarId } = this.eventoForm.value;

      // Buscar lugar completo
      const lugar = lugares.find(l => l.id === lugarId)!;

      await this.eventoService.crearEvento({
        nombre,
        descripcion,
        fecha: new Date(fecha),
        hora,
        lugarId,
        lugar: {
          nombre: lugar.nombre,
          informacion: lugar.informacion,
          altitud: lugar.altitud,
          dificultad: lugar.dificultad,
        },
        creadoPor: {
          uid: userData!.uid,
          nombre: userData!.nombre,
        },
        privado: true,
      });

      await loading.dismiss();
      await this.showToast('¡Evento creado exitosamente!', 'success');
      this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });

    } catch (error) {
      await loading.dismiss();
      await this.showToast('Error al crear el evento', 'danger');
    }
  }

  // 🔙 Volver
  goBack() {
    this.router.navigateByUrl('/tabs/eventos');
  }

  // 🍞 Toast helper
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}