import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

import { Auth } from '@angular/fire/auth';

import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Evento } from 'src/app/core/models/evento.model';
// ✅ Agrega este import
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
@Component({
  selector: 'app-evento-detalle',
  templateUrl: './evento-detalle.page.html',
  styleUrls: ['./evento-detalle.page.scss'],
  standalone: false,
})
export class EventoDetallePage implements OnInit {

  // =========================
  // 🔹 INYECCIÓN DE DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  // ✅ Inyecta el sanitizer
  private sanitizer = inject(DomSanitizer);


  // =========================
  // 📦 ESTADO DEL COMPONENTE
  // =========================
  evento: Evento | null = null;
  currentUid = this.auth.currentUser?.uid;
  esCreadoPor = false;
  mensajesNuevos = 0;

  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 🚀 INICIALIZACIÓN
  // =========================
  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const loading = await this.loadingCtrl.create({
      message: 'Cargando evento...'
    });

    await loading.present();

    try {
      this.evento = await this.eventoService.getEventoById(id);
      this.esCreadoPor = this.evento?.creadoPor.uid === this.currentUid;

      if (this.evento && this.currentUid) {
        this.mensajesNuevos = await this.eventoService.contarMensajesNuevos(
          this.evento.id!,
          this.currentUid
        );
      }

      await loading.dismiss();

    } catch (error) {
      await loading.dismiss();
      await this.showToast('Error al cargar el evento', 'danger');
      this.goBack();
    }
  }

  // =========================
  // 📋 CÓDIGO INVITACIÓN
  // =========================
  async onCopiarCodigo() {
    if (!this.evento) return;

    await Clipboard.write({ string: this.evento.codigoInvitacion });
    await this.showToast('Código copiado al portapapeles', 'success');
  }

  // =========================
  // 🔗 COMPARTIR EVENTO
  // =========================
  async onCompartir() {
    if (!this.evento) return;

    try {
      await Share.share({
        title: `¡Te invito al evento: ${this.evento.nombre}!`,
        text: `Únete a "${this.evento.nombre}" en ${this.evento.lugar.nombre}.
Código: ${this.evento.codigoInvitacion}
Fecha: ${new Date(this.evento.fecha.toDate()).toLocaleDateString('es-CL')} a las ${this.evento.hora}`,
        dialogTitle: 'Compartir evento',
      });
    } catch {
      await this.onCopiarCodigo();
    }
  }

  // =========================
  // 🚪 SALIR DEL EVENTO
  // =========================
  async onSalirEvento() {
    const alert = await this.alertCtrl.create({
      header: 'Salir del evento',
      message: '¿Estás seguro que deseas salir de este evento?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Saliendo...'
            });

            await loading.present();

            try {
              await this.eventoService.salirEvento(
                this.evento!.id!,
                this.currentUid!
              );

              await loading.dismiss();
              await this.showToast('Saliste del evento', 'success');
              this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });

            } catch {
              await loading.dismiss();
              await this.showToast('Error al salir del evento', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 🗑️ ELIMINAR EVENTO
  // =========================
  async onEliminarEvento() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Eliminar <strong>${this.evento?.nombre}</strong>? Esta acción es irreversible.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Eliminando...'
            });

            await loading.present();

            try {
              await this.eventoService.eliminarEvento(this.evento!.id!);

              await loading.dismiss();
              await this.showToast('Evento eliminado', 'success');
              this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });

            } catch {
              await loading.dismiss();
              await this.showToast('Error al eliminar el evento', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 🔙 NAVEGACIÓN
  // =========================
  goBack() {
    this.router.navigateByUrl('/tabs/eventos');
  }

  irAlForo() {
    if (this.currentUid) {
      this.eventoService.marcarForoVisto(this.evento!.id!, this.currentUid);
      this.mensajesNuevos = 0;
    }

    this.router.navigateByUrl(
      `/tabs/foro/${this.evento!.id}/${this.evento!.creadoPor.uid}`
    );
  }

  // =========================
  // 📜 SCROLL HEADER
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    this.hideHeader =
      scrollTop > this.lastScrollTop && scrollTop > 50;

    this.lastScrollTop = scrollTop;
  }

  // =========================
  // 🍞 TOAST HELPER
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

  // ✅ Agrega este método
  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}