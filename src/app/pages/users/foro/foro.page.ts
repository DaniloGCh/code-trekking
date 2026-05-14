// src/app/pages/users/foro/foro.page.ts

import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  // =========================
  // 📌 VIEW CHILD
  // =========================
  @ViewChild(IonContent) content!: IonContent;

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private security = inject(SecurityService);

  // =========================
  // 📊 ESTADO GENERAL
  // =========================
  eventoId: string = '';
  organizadorUid: string = '';

  mensajes$: Observable<MensajeForo[]> | null = null;
  userData: UserData | null = null;

  currentUid = this.auth.currentUser?.uid;

  nuevoMensaje: string = '';
  cargando = false;

  // =========================
  // 🎨 UI STATE
  // =========================
  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 😊 EMOJIS RÁPIDOS
  // =========================
  emojis = ['😄', '👍', '💪', '🏔️', '🥾', '🎒', '⛺', '🌄', '👏', '🔥'];

  // =========================
  // 🚀 INIT
  // =========================
async ngOnInit() {
  this.eventoId = this.route.snapshot.paramMap.get('eventoId') || '';
  this.organizadorUid = this.route.snapshot.paramMap.get('organizadorUid') || '';

  this.userData = await this.authService.getCurrentUserData();

  // 🔥 TIEMPO REAL
  this.mensajes$ = this.eventoService.getMensajesForoRealtime(this.eventoId);

  setTimeout(() => this.scrollAlFinal(), 300);
}

  // =========================
  // 📥 MENSAJES
  // =========================
  // async cargarMensajes() {
  //   this.cargando = true;

  //   try {
  //     this.mensajes = await this.eventoService.getMensajesForo(this.eventoId);
  //     setTimeout(() => this.scrollAlFinal(), 100);
  //   } catch {
  //     await this.showToast('Error al cargar los mensajes', 'danger');
  //   } finally {
  //     this.cargando = false;
  //   }
  // }

  // async onRefresh(event: any) {
  //   await this.cargarMensajes();
  //   event.target.complete();
  // }

  // =========================
  // ✍️ ENVIAR MENSAJE
  // =========================
async onEnviarMensaje() {

  if (!this.nuevoMensaje.trim()) return;
  if (!this.userData) return;

  // ✅ Validar contenido del mensaje
  if (!this.security.isSafeText(this.nuevoMensaje, 500)) {
    await this.showToast('El mensaje contiene contenido no permitido', 'danger');
    return;
  }

  // ✅ Rate limiting mensajes
  if (!this.security.checkRateLimit('foro-mensaje', 10, 60000)) {
    await this.showToast(
      'Estás enviando mensajes muy rápido. Espera un momento.',
      'warning'
    );
    return;
  }

  // ✅ Sanitizar mensaje
  const textoSeguro = this.security.sanitizeInput(
    this.nuevoMensaje.trim()
  );

  // limpiar input
  this.nuevoMensaje = '';

  // scroll inmediato
  setTimeout(() => this.scrollAlFinal(), 100);

  try {

    await this.eventoService.enviarMensaje(this.eventoId, {
      texto: textoSeguro,
      autorUid: this.userData.uid,
      autorNombre: this.userData.nombre,
      creadoEn: new Date(),
    });

  } catch (error) {

    await this.showToast(
      'Error al enviar el mensaje',
      'danger'
    );
  }
}

  // =========================
  // 😊 EMOJIS
  // =========================
  agregarEmoji(emoji: string) {
    this.nuevoMensaje += emoji;
  }

  // =========================
  // 🗑️ ELIMINAR MENSAJE
  // =========================
  async onEliminarMensaje(mensaje: MensajeForo) {
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
}