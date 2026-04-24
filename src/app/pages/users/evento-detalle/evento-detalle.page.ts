// src/app/pages/users/evento-detalle/evento-detalle.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { Evento } from 'src/app/core/models/evento.model';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-evento-detalle',
  templateUrl: './evento-detalle.page.html',
  styleUrls: ['./evento-detalle.page.scss'],
  standalone: false,
})
export class EventoDetallePage implements OnInit {

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  evento: Evento | null = null;
  currentUid = this.auth.currentUser?.uid;
  esCreadoPor = false;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const loading = await this.loadingCtrl.create({ message: 'Cargando evento...' });
    await loading.present();

    try {
      this.evento = await this.eventoService.getEventoById(id);
      this.esCreadoPor = this.evento?.creadoPor.uid === this.currentUid;
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      await this.showToast('Error al cargar el evento', 'danger');
      this.goBack();
    }
  }

  // 📋 COPIAR CÓDIGO AL PORTAPAPELES
  async onCopiarCodigo() {
    if (!this.evento) return;
    await Clipboard.write({ string: this.evento.codigoInvitacion });
    await this.showToast('Código copiado al portapapeles', 'success');
  }

  // 🔗 COMPARTIR EVENTO
  async onCompartir() {
    if (!this.evento) return;

    try {
      await Share.share({
        title: `¡Te invito al evento: ${this.evento.nombre}!`,
        text: `Únete a mi evento de trekking "${this.evento.nombre}" en ${this.evento.lugar.nombre}.\n\nUsa el código de invitación: ${this.evento.codigoInvitacion}\n\nFecha: ${new Date(this.evento.fecha.toDate()).toLocaleDateString('es-CL')} a las ${this.evento.hora}`,
        dialogTitle: 'Compartir evento',
      });
    } catch (error) {
      // Si Share no está disponible copiar al portapapeles
      await this.onCopiarCodigo();
    }
  }

  // 🚪 SALIR DEL EVENTO
  async onSalirEvento() {
    const alert = await this.alertCtrl.create({
      header: 'Salir del evento',
      message: '¿Estás seguro que deseas salir de este evento?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Saliendo...' });
            await loading.present();

            try {
              await this.eventoService.salirEvento(this.evento!.id!, this.currentUid!);
              await loading.dismiss();
              await this.showToast('Saliste del evento', 'success');
              this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });
            } catch (error) {
              await loading.dismiss();
              await this.showToast('Error al salir del evento', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // 🗑️ ELIMINAR EVENTO
  async onEliminarEvento() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Estás seguro que deseas eliminar <strong>${this.evento?.nombre}</strong>? Esta acción es irreversible.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();

            try {
              await this.eventoService.eliminarEvento(this.evento!.id!);
              await loading.dismiss();
              await this.showToast('Evento eliminado', 'success');
              this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });
            } catch (error) {
              await loading.dismiss();
              await this.showToast('Error al eliminar el evento', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
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