import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';
import { Evento } from 'src/app/core/models/evento.model';

import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc, deleteDoc, getDocs } from '@angular/fire/firestore';

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
  private authService   = inject(AuthService);
  private security      = inject(SecurityService);
  private auth          = inject(Auth);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);
  private alertCtrl     = inject(AlertController);
  private toastCtrl     = inject(ToastController);
  private loadingCtrl   = inject(LoadingController);
  private firestore     = inject(Firestore);

  // =========================
  // 📊 DATOS
  // =========================
  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();

  misEventosOrdenados$ = this.misEventos$.pipe(
    map(eventos => [...eventos].sort((a, b) => {
      const prioridadA = this.getPrioridadEvento(a);
      const prioridadB = this.getPrioridadEvento(b);
      if (prioridadA !== prioridadB) return prioridadA - prioridadB;
      const fechaA = a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaA.getTime() - fechaB.getTime();
    }))
  );

  userData: UserData | null = null;
  currentUid: string | null = this.auth.currentUser?.uid || null;
  evento: Evento | null     = null;
  esCreadoPor               = false;
  mensajesNuevosMap: { [eventoId: string]: number } = {};
  favoritos: string[]       = [];
  hideHeader                = false;
  lastScrollTop             = 0;

  // =========================
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    // ✅ Verificar autenticación
    if (!this.auth.currentUser) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    await this.loadFavoritos();

    this.authService.currentUser$.subscribe(async user => {
      this.currentUid = user?.uid || null;

      if (user) {
        // 🔹 Solución: Obtener datos del usuario para activar la directiva *ngIf="userData"
        this.userData = await this.authService.getCurrentUserData();
      } else {
        this.userData = null;
      }

      this.misEventos$.subscribe(async eventos => {
        if (!this.currentUid) return;

        for (const ev of eventos) {
          if (!ev.id) continue;
          if (!this.security.isValidFirestoreId(ev.id)) continue;

          const cantidad = await this.eventoService.contarMensajesNuevos(
            ev.id, this.currentUid
          );
          this.mensajesNuevosMap[ev.id] = cantidad;
        }
      });
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    if (!this.security.isValidFirestoreId(id)) {
      await this.showToast('ID de evento inválido', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Cargando evento...' });
    await loading.present();

    try {
      this.evento      = await this.eventoService.getEventoById(id);
      this.esCreadoPor = this.evento?.creadoPor.uid === this.currentUid;
      await loading.dismiss();
    } catch {
      await loading.dismiss();
      await this.showToast('Error al cargar el evento', 'danger');
      this.goBack();
    }
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  // =========================
  // ➕ CREAR EVENTO
  // =========================
  goCrearEvento() {
    if (!this.auth.currentUser) {
      this.showToast('Debes iniciar sesión para crear evento', 'warning');
      return;
    }
    this.router.navigateByUrl('/tabs/crear-evento');
  }

  // =========================
  // 🔑 UNIRSE CON CÓDIGO
  // =========================
  async onUnirseConCodigo() {
    if (!this.auth.currentUser) {
      await this.showToast('Debes iniciar sesión para unirte a un evento', 'warning');
      return;
    }

    if (!this.security.checkRateLimit('unirse-codigo', 5, 60000)) {
      await this.showToast('Demasiados intentos. Espera un momento.', 'warning');
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

            const codigoLimpio = data.codigo.trim().toUpperCase();
            const codigoRegex  = /^TRK-[A-Z0-9]{6}$/;

            if (!codigoRegex.test(codigoLimpio)) {
              await this.showToast('Formato de código inválido. Ej: TRK-ABC123', 'warning');
              return false;
            }

            if (!this.security.isSafeText(codigoLimpio, 10)) {
              await this.showToast('Código contiene caracteres no permitidos', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Buscando evento...' });
            await loading.present();

            try {
              const evento = await this.eventoService.unirseConCodigo(codigoLimpio);
              await loading.dismiss();
              this.security.resetRateLimit('unirse-codigo');

              const nombreSeguro = this.security.sanitizeInput(evento?.nombre || '');
              await this.showToast(`¡Te uniste a ${nombreSeguro}!`, 'success');

            } catch (error: any) {
              await loading.dismiss();

              const messages: Record<string, string> = {
                'codigo-invalido':   'El código no existe o es incorrecto.',
                'ya-participante':   'Ya eres participante de este evento.',
                'evento-finalizado': 'No puedes unirte, el evento ya finalizó.',
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
    if (!eventoId || !this.security.isValidFirestoreId(eventoId)) return;
    this.router.navigateByUrl(`/tabs/evento-detalle/${eventoId}`);
  }

  // =========================
  // 🗑️ ELIMINAR EVENTO
  // =========================
  async onEliminarEvento(evento: Evento) {
    if (evento.creadoPor.uid !== this.currentUid) {
      await this.showToast('No tienes permisos para eliminar este evento', 'danger');
      return;
    }

    const nombreSeguro = this.security.sanitizeInput(evento.nombre);

    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Eliminar ${nombreSeguro}?`,
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

    try {
      const ref  = collection(this.firestore, `usuarios/${user.uid}/favoritos`);
      const snap = await getDocs(ref);
      this.favoritos = snap.docs.map(d => d.id);
    } catch {
      await this.showToast('Error al cargar favoritos', 'danger');
    }
  }

  isFavorito(eventoId: string): boolean {
    if (!eventoId) return false;
    return this.favoritos.includes(eventoId);
  }

  async toggleFavorito(evento: Evento) {
    const user = this.auth.currentUser;

    if (!user) {
      await this.showToast('Debes iniciar sesión para guardar favoritos', 'warning');
      return;
    }

    if (!evento.id || !this.security.isValidFirestoreId(evento.id)) {
      await this.showToast('Evento inválido', 'danger');
      return;
    }

    if (!this.security.checkRateLimit('toggle-favorito', 10, 60000)) {
      await this.showToast('Demasiados cambios. Espera un momento.', 'warning');
      return;
    }

    try {
      const favRef = doc(this.firestore, `usuarios/${user.uid}/favoritos/${evento.id}`);

      if (this.isFavorito(evento.id)) {
        await deleteDoc(favRef);
        this.favoritos = this.favoritos.filter(id => id !== evento.id);
        await this.showToast('Eliminado de favoritos', 'medium');
      } else {
        await setDoc(favRef, {
          eventoId: evento.id,
          nombre:   this.security.sanitizeInput(evento.nombre),
          fecha:    new Date()
        });
        this.favoritos.push(evento.id);
        await this.showToast('Agregado a favoritos ⭐', 'success');
      }
    } catch {
      await this.showToast('Error al actualizar favoritos', 'danger');
    }
  }

  // =========================
  // 💬 FORO
  // =========================
  irAlForo(evento: Evento) {
    if (!evento.id || !evento.creadoPor?.uid) return;

    if (!this.security.isValidFirestoreId(evento.id)) return;

    if (this.currentUid) {
      this.eventoService.marcarForoVisto(evento.id, this.currentUid);
      this.mensajesNuevosMap[evento.id] = 0;
    }

    this.router.navigateByUrl(`/tabs/foro/${evento.id}/${evento.creadoPor.uid}`);
  }

  getMensajesNuevos(eventoId?: string): number {
    if (!eventoId) return 0;
    return this.mensajesNuevosMap[eventoId] || 0;
  }

  // =========================
  // 🔵 ESTADO EVENTOS
  // =========================
  esEventoProximo(evento: Evento): boolean {
    if (!evento?.fecha) return false;
    const fechaEvento   = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
    const hoy           = new Date();
    const eventoSinHora = new Date(fechaEvento.getFullYear(), fechaEvento.getMonth(), fechaEvento.getDate());
    const hoySinHora    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return eventoSinHora > hoySinHora;
  }

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

  esEventoFinalizado(evento: Evento): boolean {
    if (!evento?.fecha) return false;
    const fechaEvento = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
    return fechaEvento < new Date();
  }

  getPrioridadEvento(evento: Evento): number {
    if (this.esEventoEnCurso(evento))   return 1;
    if (this.esEventoProximo(evento))   return 2;
    if (this.esEventoFinalizado(evento)) return 3;
    return 4;
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
  // 🔙 NAVEGACIÓN
  // =========================
  goBack() {
    this.router.navigateByUrl('/tabs/eventos');
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