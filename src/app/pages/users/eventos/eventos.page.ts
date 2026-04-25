// src/app/pages/users/eventos/eventos.page.ts

// 🔹 Decorador para definir el componente
import { Component, OnInit, inject } from '@angular/core';

// 🔹 Router para navegación entre páginas
import { Router } from '@angular/router';

// 🔹 Controladores de Ionic para UI (alertas, toast, loading)
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';

// 🔹 Observable para manejar datos reactivos
import { Observable } from 'rxjs';

// 🔹 Servicio de eventos (Firestore)
import { EventoService } from 'src/app/core/services/evento.service';

// 🔹 Servicio de autenticación
import { AuthService } from 'src/app/core/services/auth.service';

// 🔹 Modelo de evento
import { Evento } from 'src/app/core/models/evento.model';

// 🔹 Firebase Auth
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc, deleteDoc, getDocs } from '@angular/fire/firestore';


@Component({
  selector: 'app-eventos', // Nombre del selector HTML
  templateUrl: './eventos.page.html', // Vista HTML
  styleUrls: ['./eventos.page.scss'], // Estilos
  standalone: false,
})
export class EventosPage implements OnInit {

  // =========================
  // 🔌 INYECCIÓN DE DEPENDENCIAS
  // =========================

  private eventoService = inject(EventoService); // Servicio para manejar eventos
  private authService = inject(AuthService);     // Servicio de autenticación
  private auth = inject(Auth);                   // Firebase Auth
  private router = inject(Router);               // Navegación
  private alertCtrl = inject(AlertController);   // Alertas
  private toastCtrl = inject(ToastController);   // Toasts (mensajes cortos)
  private loadingCtrl = inject(LoadingController); // Loading spinner
  private firestore = inject(Firestore);

  // =========================
  // 📊 DATOS
  // =========================

  // 🔹 Observable con los eventos donde participa el usuario
  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();

  // 🔹 UID del usuario actual
currentUid: string | null = null;

  // =========================
  // 🔽 CONTROL DE HEADER CON SCROLL
  // =========================
  hideHeader = false;     // Indica si el header está oculto
  lastScrollTop = 0;      // Guarda la última posición del scroll


  favoritos: string[] = [];
  // =========================
  // 🚀 CICLO DE VIDA
  // =========================
  async ngOnInit() {
    this.loadFavoritos();
    this.authService.currentUser$.subscribe(user => {
  this.currentUid = user?.uid || null;
});// Se ejecuta al inicializar el componente
  }

  
  // =========================
  // ➕ IR A CREAR EVENTO
  // =========================
  goCrearEvento() {

  // 🔐 Validar si hay usuario logueado
  const user = this.auth.currentUser;

  if (!user) {

    // 🚫 Si no está logueado, mostrar mensaje
    this.showToast(
      'Debes iniciar sesión para crear evento',
      'warning'
    );

    return;
  }

  // ✅ Si está logueado, navegar
  this.router.navigateByUrl('/tabs/crear-evento');
}

  // =========================
  // 🔑 UNIRSE A EVENTO CON CÓDIGO
  // =========================
 async onUnirseConCodigo() {

  // 🔐 Validar usuario autenticado
  const user = this.auth.currentUser;

  if (!user) {

    // 🚫 Si no está logueado, mostrar aviso
    await this.showToast(
      'Debes iniciar sesión para unirte a un evento',
      'warning'
    );

    return;
  }

  // ✅ Si está logueado, continuar flujo normal

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
  // 👁️ VER DETALLE DE EVENTO
  // =========================
  verEvento(eventoId: string) {
    // Navega al detalle del evento usando su ID
    this.router.navigateByUrl(`/tabs/evento-detalle/${eventoId}`);
  }

  // =========================
  // 🗑️ ELIMINAR EVENTO
  // =========================
  async onEliminarEvento(evento: Evento) {

    // Confirmación antes de eliminar
    const alert = await this.alertCtrl.create({
      header: 'Eliminar evento',
      message: `¿Estás seguro que deseas eliminar <strong>${evento.nombre}</strong>?`,

      buttons: [
        { text: 'Cancelar', role: 'cancel' },

        {
          text: 'Eliminar',
          handler: async () => {

            // Mostrar loading
            const loading = await this.loadingCtrl.create({ message: 'Eliminando...' });
            await loading.present();

            try {
              // Llamar al servicio para eliminar
              await this.eventoService.eliminarEvento(evento.id!);

              await loading.dismiss();

              // Mostrar éxito
              await this.showToast('Evento eliminado', 'success');

            } catch (error) {
              await loading.dismiss();

              // Mostrar error
              await this.showToast('Error al eliminar el evento', 'danger');
            }
          }
        }
      ]
    });

    // Mostrar alerta
    await alert.present();
  }

  // =========================
  // 🍞 TOAST HELPER
  // =========================
  private async showToast(message: string, color: string = 'success') {

    // Crear toast
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });

    // Mostrar toast
    await toast.present();
  }

  // =========================
  // 👇 CONTROL DE SCROLL PARA HEADER
  // =========================
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

  const favRef = doc(this.firestore, `usuarios/${user.uid}/favoritos/${evento.id}`);

  if (this.isFavorito(evento.id)) {

    // ❌ eliminar favorito
    await deleteDoc(favRef);

    this.favoritos = this.favoritos.filter(id => id !== evento.id);

    this.showToast('Eliminado de favoritos', 'medium');

  } else {

    // ⭐ agregar favorito
    await setDoc(favRef, {
      eventoId: evento.id,
      nombre: evento.nombre,
      fecha: new Date()
    });

    this.favoritos.push(evento.id);

    this.showToast('Agregado a favoritos ⭐', 'success');
  }
}

}