import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular';
import { Observable } from 'rxjs';

import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Evento } from 'src/app/core/models/evento.model';

import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs
} from '@angular/fire/firestore';

@Component({
  selector: 'app-eventos',
  templateUrl: './eventos.page.html',
  styleUrls: ['./eventos.page.scss'],
  standalone: false,
})
export class EventosPage implements OnInit {

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private auth = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private firestore = inject(Firestore);

  // =========================
  // 📊 DATOS PRINCIPALES
  // =========================
  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();
  currentUid: string | null = this.auth.currentUser?.uid || null;

  evento: Evento | null = null;
  esCreadoPor = false;

  // 🔥 Contador de mensajes por evento
  mensajesNuevosMap: { [eventoId: string]: number } = {};

  // =========================
  // ⭐ FAVORITOS
  // =========================
  favoritos: string[] = [];

  // =========================
  // 🎨 UI / SCROLL
  // =========================
  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 🚀 CICLO DE VIDA
  // =========================
  async ngOnInit() {
    this.loadFavoritos();

    this.authService.currentUser$.subscribe(user => {
      this.currentUid = user?.uid || null;

      // 🔥 Cargar contador de mensajes por evento
      this.misEventos$.subscribe(async (eventos) => {
        if (!this.currentUid) return;

        for (const ev of eventos) {
          if (!ev.id) continue;

          const cantidad = await this.eventoService.contarMensajesNuevos(
            ev.id,
            this.currentUid
          );

          this.mensajesNuevosMap[ev.id] = cantidad;
        }
      });
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const loading = await this.loadingCtrl.create({
      message: 'Cargando evento...'
    });

    await loading.present();

    try {
      this.evento = await this.eventoService.getEventoById(id);
      this.esCreadoPor = this.evento?.creadoPor.uid === this.currentUid;

      await loading.dismiss();

    } catch {
      await loading.dismiss();
      await this.showToast('Error al cargar el evento', 'danger');
      this.goBack();
    }
  }

  // =========================
  // ➕ CREAR EVENTO
  // =========================
  goCrearEvento() {
    const user = this.auth.currentUser;

    if (!user) {
      this.showToast('Debes iniciar sesión para crear evento', 'warning');
      return;
    }

    this.router.navigateByUrl('/tabs/crear-evento');
  }

  // =========================
  // 🔑 UNIRSE CON CÓDIGO
  // =========================
  async onUnirseConCodigo() {
    const user = this.auth.currentUser;

    if (!user) {
      await this.showToast('Debes iniciar sesión para unirte a un evento', 'warning');
      return;
    }

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

            if (!data.codigo?.trim()) {
              await this.showToast('Ingresa un código válido', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({
              message: 'Buscando evento...'
            });
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

              await this.showToast(
                messages[error.message] || 'Error al unirse al evento',
                'danger'
              );
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 👁️ VER EVENTO
  // =========================
  verEvento(eventoId: string) {
    this.router.navigateByUrl(`/tabs/evento-detalle/${eventoId}`);
  }

  // =========================
  // 🗑️ ELIMINAR EVENTO
  // =========================
  async onEliminarEvento(evento: Evento) {

    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Eliminar <strong>${evento.nombre}</strong>?`,
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
              await this.eventoService.eliminarEvento(evento.id!);
              await loading.dismiss();
              await this.showToast('Evento eliminado', 'success');

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
  // ⭐ FAVORITOS
  // =========================
  async loadFavoritos() {
    const user = this.auth.currentUser;
    if (!user) return;

    const ref = collection(this.firestore, `usuarios/${user.uid}/favoritos`);
    const snap = await getDocs(ref);

    this.favoritos = snap.docs.map(doc => doc.id);
  }

  isFavorito(eventoId: string): boolean {
    return this.favoritos.includes(eventoId);
  }

  async toggleFavorito(evento: any) {
    const user = this.auth.currentUser;

    if (!user) {
      this.showToast('Debes iniciar sesión para guardar favoritos', 'warning');
      return;
    }

    const favRef = doc(
      this.firestore,
      `usuarios/${user.uid}/favoritos/${evento.id}`
    );

    if (this.isFavorito(evento.id)) {

      await deleteDoc(favRef);
      this.favoritos = this.favoritos.filter(id => id !== evento.id);
      this.showToast('Eliminado de favoritos', 'medium');

    } else {

      await setDoc(favRef, {
        eventoId: evento.id,
        nombre: evento.nombre,
        fecha: new Date()
      });

      this.favoritos.push(evento.id);
      this.showToast('Agregado a favoritos ⭐', 'success');
    }
  }

  // =========================
  // 💬 FORO
  // =========================
  irAlForo(evento: Evento) {
    if (!evento.id) return;

    if (this.currentUid) {
      this.eventoService.marcarForoVisto(evento.id, this.currentUid);
      this.mensajesNuevosMap[evento.id] = 0;
    }

    this.router.navigateByUrl(
      `/tabs/foro/${evento.id}/${evento.creadoPor.uid}`
    );
  }

  getMensajesNuevos(eventoId?: string): number {
    if (!eventoId) return 0;
    return this.mensajesNuevosMap[eventoId] || 0;
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
  // 📜 SCROLL
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;

    this.hideHeader =
      scrollTop > this.lastScrollTop && scrollTop > 50;

    this.lastScrollTop = scrollTop;
  }

  // =========================
  // 🔙 NAVEGACIÓN
  // =========================
  goBack() {
    this.router.navigateByUrl('/tabs/eventos');
  }

  // =========================
// 🔵 EVENTO PRÓXIMO (FUTURO)
// =========================
esEventoProximo(evento: Evento): boolean {
  if (!evento?.fecha) return false;

  const fechaEvento = evento.fecha.toDate
    ? evento.fecha.toDate()
    : new Date(evento.fecha);

  const hoy = new Date();

  // Limpiar horas para comparar solo fechas
  const eventoSinHora = new Date(
    fechaEvento.getFullYear(),
    fechaEvento.getMonth(),
    fechaEvento.getDate()
  );

  const hoySinHora = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );

  return eventoSinHora > hoySinHora;
}

  // =========================
// 🟢 EVENTO EN CURSO (HOY)
// =========================
esEventoEnCurso(evento: Evento): boolean {
  if (!evento?.fecha) return false;

  const fechaEvento = evento.fecha.toDate
    ? evento.fecha.toDate()
    : new Date(evento.fecha);

  const hoy = new Date();

  return (
    fechaEvento.getDate() === hoy.getDate() &&
    fechaEvento.getMonth() === hoy.getMonth() &&
    fechaEvento.getFullYear() === hoy.getFullYear()
  );
}

  // =========================
  // ⏰ VALIDAR SI EVENTO FINALIZÓ
  // =========================
  esEventoFinalizado(evento: Evento): boolean {
    if (!evento?.fecha) return false;

    const fechaEvento = evento.fecha.toDate
      ? evento.fecha.toDate() // 🔥 Firestore Timestamp
      : new Date(evento.fecha);

    const ahora = new Date();

    return fechaEvento < ahora;
  }

  
}