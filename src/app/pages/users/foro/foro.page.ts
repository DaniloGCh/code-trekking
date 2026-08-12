// src/app/pages/users/foro/foro.page.ts

import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';

import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { MensajeForo } from 'src/app/core/models/evento.model';
import { Observable } from 'rxjs';
import { SecurityService } from 'src/app/core/services/security.service';

@Component({
  selector: 'app-foro',
  templateUrl: './foro.page.html',
  styleUrls: ['./foro.page.scss'],
  standalone: false,
})
export class ForoPage implements OnInit {

  @ViewChild(IonContent) content!: IonContent;

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService   = inject(AuthService);
  private auth          = inject(Auth);
  private route         = inject(ActivatedRoute);
  private router        = inject(Router); // ✅ Para redirigir si no autenticado
  private toastCtrl     = inject(ToastController);
  private alertCtrl     = inject(AlertController);
  private security      = inject(SecurityService);

  // =========================
  // 📊 ESTADO
  // =========================
  eventoId        = '';
  organizadorUid  = '';
  mensajes$: Observable<MensajeForo[]> | null = null;
  userData: UserData | null = null;
  currentUid = this.auth.currentUser?.uid;
  nuevoMensaje = '';
  cargando = false;

  hideHeader    = false;
  lastScrollTop = 0;

  emojis = ['😄', '👍', '💪', '🏔️', '🥾', '🎒', '⛺', '🌄', '👏', '🔥'];

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    // ✅ Verificar autenticación antes de cargar
    if (!this.auth.currentUser) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    this.eventoId      = this.route.snapshot.paramMap.get('eventoId') || '';
    this.organizadorUid = this.route.snapshot.paramMap.get('organizadorUid') || '';

    // ✅ Validar que los parámetros no estén vacíos
    if (!this.eventoId || !this.organizadorUid) {
      await this.showToast('Foro no disponible', 'danger');
      this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });
      return;
    }

    // ✅ Validar que los parámetros sean seguros
    if (!this.security.isSafeText(this.eventoId, 50) ||
        !this.security.isSafeText(this.organizadorUid, 50)) {
      await this.showToast('Parámetros inválidos', 'danger');
      this.router.navigateByUrl('/tabs/eventos', { replaceUrl: true });
      return;
    }

    this.userData  = await this.authService.getCurrentUserData();
    this.mensajes$ = this.eventoService.getMensajesForoRealtime(this.eventoId);

    // ✅ Marcar foro como visto
    if (this.currentUid) {
      this.eventoService.marcarForoVisto(this.eventoId, this.currentUid);
    }

    setTimeout(() => this.scrollAlFinal(), 300);
  }

  // =========================
  // ✍️ ENVIAR MENSAJE
  // =========================
  async onEnviarMensaje() {
    if (!this.nuevoMensaje.trim()) return;

    // ✅ Verificar sesión activa antes de enviar
    if (!this.userData || !this.auth.currentUser) {
      await this.showToast('Tu sesión ha expirado. Inicia sesión nuevamente.', 'danger');
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    // ✅ Validar longitud mínima
    if (this.nuevoMensaje.trim().length < 1) {
      return;
    }

    // ✅ Validar contenido XSS
    if (!this.security.isSafeText(this.nuevoMensaje, 500)) {
      await this.showToast('El mensaje contiene contenido no permitido', 'danger');
      this.nuevoMensaje = '';
      return;
    }

    // ✅ Rate limiting: 10 mensajes por minuto
    if (!this.security.checkRateLimit('foro-mensaje', 10, 60000)) {
      await this.showToast('Estás enviando mensajes muy rápido. Espera un momento.', 'warning');
      return;
    }

    // ✅ Sanitizar mensaje
    const textoSeguro = this.security.sanitizeInput(this.nuevoMensaje.trim());
    this.nuevoMensaje = '';
    setTimeout(() => this.scrollAlFinal(), 100);


    try {
    await this.eventoService.enviarMensaje(this.eventoId, {
    texto:       textoSeguro,
    autorUid:    this.userData.uid,
    autorNombre: this.userData.nombre,
    creadoEn:    new Date()
    // creadoEn se asigna automáticamente en el service con serverTimestamp()
    } as any);

    // Hacer scroll al recibir la confirmación de envío
    setTimeout(() => this.scrollAlFinal(), 150);
    } catch {
    await this.showToast('Error al enviar el mensaje', 'danger');
    }
    // try {
    //   await this.eventoService.enviarMensaje(this.eventoId, {
    //     texto:       textoSeguro,
    //     autorUid:    this.userData.uid,
    //     autorNombre: this.userData.nombre,
    //     creadoEn:    new Date(),
    //   });
    // } catch {
    //   await this.showToast('Error al enviar el mensaje', 'danger');
    // }
  }

  // =========================
  // 😊 EMOJIS
  // =========================
  agregarEmoji(emoji: string) {
    // ✅ Validar que el mensaje no supere el límite con el emoji
    if ((this.nuevoMensaje + emoji).length > 500) {
      this.showToast('El mensaje no puede superar 500 caracteres', 'warning');
      return;
    }
    this.nuevoMensaje += emoji;
  }

  // =========================
  // 🗑️ ELIMINAR MENSAJE
  // =========================
  async onEliminarMensaje(mensaje: MensajeForo) {
    // ✅ Solo el organizador puede eliminar
    if (this.currentUid !== this.organizadorUid) {
      await this.showToast('No tienes permisos para eliminar mensajes', 'danger');
      return;
    }

    // ✅ Verificar que el mensaje tiene id
    if (!mensaje.id) {
      await this.showToast('Mensaje inválido', 'danger');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Eliminar mensaje',
      message: '¿Estás seguro que deseas eliminar este mensaje?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              await this.eventoService.eliminarMensaje(this.eventoId, mensaje.id!);
              await this.showToast('Mensaje eliminado', 'success');
            } catch {
              await this.showToast('Error al eliminar el mensaje', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 📜 SCROLL
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }

  private scrollAlFinal() {
    this.content?.scrollToBottom(300);
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
  // 🕒 FORMATEAR FECHA / TIMESTAMP
  // =========================
  obtenerFecha(creadoEn: any): Date | null {
    if (!creadoEn) return null;
    
    // Si viene como Timestamp de Firestore
    if (typeof creadoEn.toDate === 'function') {
      return creadoEn.toDate();
    }
    
    // Si ya es un objeto Date
    if (creadoEn instanceof Date) {
      return creadoEn;
    }

    // Si es un string o número ejecutable por Date
    return new Date(creadoEn);
  }

}


