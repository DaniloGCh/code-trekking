// src/app/pages/users/foro/foro.page.ts

import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { MensajeForo } from 'src/app/core/models/evento.model';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-foro',
  templateUrl: './foro.page.html',
  styleUrls: ['./foro.page.scss'],
  standalone: false,
})
export class ForoPage implements OnInit {

  @ViewChild(IonContent) content!: IonContent;

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  eventoId: string = '';
  organizadorUid: string = '';
  mensajes: MensajeForo[] = [];
  userData: UserData | null = null;
  currentUid = this.auth.currentUser?.uid;
  nuevoMensaje: string = '';
  cargando = false;

  hideHeader = false;     // Indica si el header está oculto
  lastScrollTop = 0;      // Guarda la última posición del scroll

  // 😊 Emojis rápidos
  emojis = ['😄', '👍', '💪', '🏔️', '🥾', '🎒', '⛺', '🌄', '👏', '🔥'];

  async ngOnInit() {
    this.eventoId = this.route.snapshot.paramMap.get('eventoId') || '';
    this.organizadorUid = this.route.snapshot.paramMap.get('organizadorUid') || '';
    this.userData = await this.authService.getCurrentUserData();
    await this.cargarMensajes();
  }

  // 📥 CARGAR MENSAJES
  async cargarMensajes() {
    this.cargando = true;
    try {
      this.mensajes = await this.eventoService.getMensajesForo(this.eventoId);
      setTimeout(() => this.scrollAlFinal(), 100);
    } catch (error) {
      await this.showToast('Error al cargar los mensajes', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  // 🔄 REFRESCAR MENSAJES
  async onRefresh(event: any) {
    await this.cargarMensajes();
    event.target.complete();
  }

  // ➕ AGREGAR EMOJI AL MENSAJE
  agregarEmoji(emoji: string) {
    this.nuevoMensaje += emoji;
  }

  // 📤 ENVIAR MENSAJE
  async onEnviarMensaje() {
    if (!this.nuevoMensaje.trim()) return;
    if (!this.userData) return;

    const texto = this.nuevoMensaje.trim();
    this.nuevoMensaje = '';

    // Agregar mensaje localmente de inmediato
    const mensajeLocal: MensajeForo = {
      texto,
      autorUid: this.userData.uid,
      autorNombre: this.userData.nombre,
      creadoEn: { toDate: () => new Date() }
    };
    this.mensajes.push(mensajeLocal);
    setTimeout(() => this.scrollAlFinal(), 100);

    try {
      await this.eventoService.enviarMensaje(this.eventoId, {
        texto,
        autorUid: this.userData.uid,
        autorNombre: this.userData.nombre,
        creadoEn: new Date(),
      });
    } catch (error) {
      await this.showToast('Error al enviar el mensaje', 'danger');
      // Remover mensaje local si falla
      this.mensajes.pop();
    }
  }

  // 🗑️ ELIMINAR MENSAJE (solo organizador)
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
              this.mensajes = this.mensajes.filter(m => m.id !== mensaje.id);
              await this.showToast('Mensaje eliminado', 'success');
            } catch (error) {
              await this.showToast('Error al eliminar el mensaje', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // 📜 Scroll al final
  private scrollAlFinal() {
    this.content?.scrollToBottom(300);
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

    onScroll(event: any) {

    const scrollTop = event.detail.scrollTop;

    // Si baja → ocultar header
    if (scrollTop > this.lastScrollTop && scrollTop > 50) {
      this.hideHeader = true;
    } else {
      // Si sube → mostrar header
      this.hideHeader = false;
    }

    // Guardar posición actual
    this.lastScrollTop = scrollTop;
  }
}