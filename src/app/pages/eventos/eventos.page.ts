// src/app/pages/users/eventos/eventos.page.ts

import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Evento } from 'src/app/core/models/evento.model';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-eventos',
  templateUrl: './eventos.page.html',
  styleUrls: ['./eventos.page.scss'],
  standalone: false,
})
export class EventosPage implements OnInit {

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();
  currentUid = this.auth.currentUser?.uid;

    // 🔽 header scroll
  hideHeader = false;
  lastScrollTop = 0;

  async ngOnInit() {}

  // ➕ IR A CREAR EVENTO
  goCrearEvento() {
    this.router.navigateByUrl('/tabs/crear-evento');
  }

  // 🔑 UNIRSE CON CÓDIGO
  async onUnirseConCodigo() {
    const alert = await this.alertCtrl.create({
      header: 'Unirse a un evento',
      message: 'Ingresa el código de invitación',
      inputs: [
        {
          name: 'codigo',
          type: 'text',
          placeholder: 'Ej: TRK-ABC123',
          attributes: { maxlength: 10 }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Unirse',
          handler: async (data) => {
            if (!data.codigo || data.codigo.trim().length === 0) {
              await this.showToast('Ingresa un código válido', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Buscando evento...' });
            await loading.present();

            try {
              const evento = await this.eventoService.unirseConCodigo(data.codigo);
              await loading.dismiss();
              await this.showToast(`¡Te uniste a ${evento?.nombre}!`, 'success');
            } catch (error: any) {
              await loading.dismiss();
              const messages: Record<string, string> = {
                'codigo-invalido': 'El código no existe o es incorrecto.',
                'ya-participante': 'Ya eres participante de este evento.',
              };
              await this.showToast(messages[error.message] || 'Error al unirse al evento', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // 👁️ VER DETALLE DEL EVENTO
  verEvento(eventoId: string) {
    this.router.navigateByUrl(`/tabs/evento-detalle/${eventoId}`);
  }

  // 🗑️ ELIMINAR EVENTO
  async onEliminarEvento(evento: Evento) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Estás seguro que deseas eliminar <strong>${evento.nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();

            try {
              await this.eventoService.eliminarEvento(evento.id!);
              await loading.dismiss();
              await this.showToast('Evento eliminado', 'success');
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

    // 👇 scroll header
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