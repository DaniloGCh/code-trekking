import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Auth } from '@angular/fire/auth';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';
import { Evento } from 'src/app/core/models/evento.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-evento-detalle',
  templateUrl: './evento-detalle.page.html',
  styleUrls: ['./evento-detalle.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventoDetallePage implements OnInit {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService   = inject(AuthService);
  private security      = inject(SecurityService);
  private auth          = inject(Auth);
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private alertCtrl     = inject(AlertController);
  private toastCtrl     = inject(ToastController);
  private loadingCtrl   = inject(LoadingController);
  private sanitizer     = inject(DomSanitizer);
  private cdr           = inject(ChangeDetectorRef);

  // =========================
  // 📦 ESTADO
  // =========================
  evento: Evento | null     = null;
  currentUid                = this.auth.currentUser?.uid;
  esCreadoPor               = false;
  mensajesNuevos            = 0;
  hideHeader                = false;
  lastScrollTop             = 0;
  mapaUrlSafe: SafeResourceUrl | null = null;

  // ✅ Control de visibilidad del código
  codigoVisible = false;

  // ✅ Getter para mostrar código enmascarado o real
  get codigoMostrado(): string {
    if (!this.evento?.codigoInvitacion) return '';
    return this.codigoVisible
      ? this.evento.codigoInvitacion
      : '••••••••••';
  }

  toggleCodigoVisible() {
    this.codigoVisible = !this.codigoVisible;
    this.cdr.markForCheck();
  }

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    // ✅ Verificar autenticación
    if (!this.auth.currentUser) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });
      return;
    }

    // ✅ Validar que el ID sea seguro
    if (!this.security.isSafeText(id, 50)) {
      await this.showToast('ID de evento inválido', 'danger');
      this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Cargando evento...' });
    await loading.present();

    try {
      this.evento     = await this.eventoService.getEventoById(id);
      this.esCreadoPor = this.evento?.creadoPor.uid === this.currentUid;

      // ✅ Cachear URL del mapa una sola vez
      if (this.evento?.lugar?.mapaRutaUrl) {
        this.mapaUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.evento.lugar.mapaRutaUrl
        );
      }

      if (this.evento && this.currentUid) {
        this.mensajesNuevos = await this.eventoService.contarMensajesNuevos(
          this.evento.id!,
          this.currentUid
        );
      }

      await loading.dismiss();
      this.cdr.markForCheck();

    } catch {
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

    // ✅ Solo copiar si el código es visible
    if (!this.codigoVisible) {
      await this.showToast('Muestra el código primero para copiarlo', 'warning');
      return;
    }

    await Clipboard.write({ string: this.evento.codigoInvitacion });
    await this.showToast('Código copiado al portapapeles', 'success');
  }

  // =========================
  // 🔗 COMPARTIR EVENTO
  // =========================
  async onCompartir() {
    if (!this.evento) return;

    // ✅ Sanitizar datos antes de compartir
    const nombreSeguro = this.security.sanitizeInput(this.evento.nombre);
    const lugarSeguro  = this.security.sanitizeInput(this.evento.lugar.nombre);

    try {
      await Share.share({
        title: `¡Te invito al evento: ${nombreSeguro}!`,
        text:  `Únete a "${nombreSeguro}" en ${lugarSeguro}.\nCódigo: ${this.evento.codigoInvitacion}\nFecha: ${new Date(this.evento.fecha.toDate()).toLocaleDateString('es-CL')} a las ${this.evento.hora}`,
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
    // ✅ No puede salir si es el creador
    if (this.esCreadoPor) {
      await this.showToast('El organizador no puede salir del evento', 'warning');
      return;
    }

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
    // ✅ Solo el creador puede eliminar
    if (!this.esCreadoPor) {
      await this.showToast('No tienes permisos para eliminar este evento', 'danger');
      return;
    }

    const nombreSeguro = this.security.sanitizeInput(this.evento?.nombre || '');

    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Eliminar ${nombreSeguro}? Esta acción es irreversible.`,
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
    if (!this.evento?.id || !this.evento?.creadoPor?.uid) return;

    if (this.currentUid) {
      this.eventoService.marcarForoVisto(this.evento.id, this.currentUid);
      this.mensajesNuevos = 0;
    }

    this.router.navigateByUrl(`/tabs/foro/${this.evento.id}/${this.evento.creadoPor.uid}`);
  }

  goMapa() {
    this.router.navigateByUrl('/mapa');
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
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // =========================
  // 🔵 EVENTO PRÓXIMO
  // =========================
  esEventoProximo(evento: Evento): boolean {
    if (!evento?.fecha) return false;
    const fechaEvento   = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
    const hoy           = new Date();
    const eventoSinHora = new Date(fechaEvento.getFullYear(), fechaEvento.getMonth(), fechaEvento.getDate());
    const hoySinHora    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return eventoSinHora > hoySinHora;
  }

  // =========================
  // 🟢 EVENTO EN CURSO
  // =========================
  esEventoEnCurso(evento: Evento): boolean {
    if (!evento?.fecha) return false;
    const fechaEvento = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
    const hoy = new Date();
    return (
      fechaEvento.getDate()     === hoy.getDate()     &&
      fechaEvento.getMonth()    === hoy.getMonth()    &&
      fechaEvento.getFullYear() === hoy.getFullYear()
    );
  }

  // =========================
  // ⏰ EVENTO FINALIZADO
  // =========================
  esEventoFinalizado(evento: Evento): boolean {
    if (!evento?.fecha) return false;
    const fechaEvento = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
    return fechaEvento < new Date();
  }
}