// =========================
// 📦 IMPORTS
// =========================
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController,
  ActionSheetController
} from '@ionic/angular';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import {
  Firestore,
  collection,
  getDocs,
  deleteDoc,
  doc
} from '@angular/fire/firestore';

import { AuthService, UserData } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private actionSheetCtrl = inject(ActionSheetController);
  private firestore = inject(Firestore);

  // =========================
  // 📊 ESTADO
  // =========================
  userData: UserData | null = null;
  favoritos: any[] = [];

  authReady = false;

  hideHeader = false;
  lastScrollTop = 0;

  // =========================
  // 😊 ESTADOS DE ÁNIMO
  // =========================
  estados = [
    { label: 'Excelente 😄', value: 'Excelente 😄' },
    { label: 'Bien 🙂', value: 'Bien 🙂' },
    { label: 'Normal 😐', value: 'Normal 😐' },
    { label: 'Cansado 😴', value: 'Cansado 😴' },
    { label: 'Estresado 😤', value: 'Estresado 😤' },
    { label: 'Triste 😢', value: 'Triste 😢' },
  ];

  // =========================
  // 🚀 CICLO DE VIDA
  // =========================
  async ngOnInit() {
    this.authService.currentUser$.subscribe(async user => {

      this.authReady = true;

      if (user) {
        this.userData = await this.authService.getCurrentUserData();
        await this.loadFavoritos();
      } else {
        this.userData = null;
        this.favoritos = [];
      }

    });
  }

  // =========================
  // ⭐ FAVORITOS
  // =========================
  async loadFavoritos() {
    const user = this.authService['auth'].currentUser;
    if (!user) return;

    const ref = collection(this.firestore, `usuarios/${user.uid}/favoritos`);
    const snap = await getDocs(ref);

    this.favoritos = snap.docs.map(d => ({
      eventoId: d.id,
      ...d.data()
    }));
  }

  async removeFavorito(eventoId: string) {
    const user = this.authService['auth'].currentUser;
    if (!user) return;

    const ref = doc(this.firestore, `usuarios/${user.uid}/favoritos/${eventoId}`);
    await deleteDoc(ref);

    this.favoritos = this.favoritos.filter(f => f.eventoId !== eventoId);

    this.showToast('Eliminado de favoritos', 'medium');
  }

  verEvento(id: string) {
    this.router.navigateByUrl(`/tabs/evento-detalle/${id}`);
  }

  // =========================
  // 📷 FOTO DE PERFIL
  // =========================
  async onChangeFoto() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Foto de perfil',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera-outline',
          handler: () => this.takePicture(CameraSource.Camera)
        },
        {
          text: 'Galería',
          icon: 'image-outline',
          handler: () => this.takePicture(CameraSource.Photos)
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });

    await actionSheet.present();
  }

  private async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source
      });

      if (!image.base64String) return;

      const base64 = `data:image/jpeg;base64,${image.base64String}`;

      const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
      await loading.present();

      await this.authService.updateProfile({ fotoBase64: base64 });

      if (this.userData) this.userData.fotoBase64 = base64;

      await loading.dismiss();
      await this.showToast('Foto actualizada', 'success');

    } catch {
      await this.showToast('Error al subir foto', 'danger');
    }
  }

  // =========================
  // 🚪 AUTH
  // =========================
  async onLogout() {
    await this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  goLogin() {
    this.router.navigateByUrl('/login');
  }

  goRegister() {
    this.router.navigateByUrl('/register');
  }

  goHome() {
    this.router.navigateByUrl('/tabs/home');
  }

  // =========================
  // 😊 ESTADO DE ÁNIMO
  // =========================
  async onChangeEstado() {
    const alert = await this.alertCtrl.create({
      header: '¿Cómo te sientes hoy?',
      inputs: [
        ...this.estados.map(e => ({
          type: 'radio' as const,
          label: e.label,
          value: e.value,
          checked: this.userData?.estado === e.value
        })),
        {
          type: 'radio' as const,
          label: '✏️ Escribir mi propio estado',
          value: 'custom',
          checked: this.userData?.estado !== '' &&
            !this.estados.some(e => e.value === this.userData?.estado)
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Siguiente',
          handler: async (selected) => {
            if (!selected) return false;

            selected === 'custom'
              ? await this.showCustomEstadoInput()
              : await this.saveEstado(selected);

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async showCustomEstadoInput() {
    const alert = await this.alertCtrl.create({
      header: 'Estado personalizado',
      inputs: [
        {
          name: 'estadoCustom',
          type: 'text',
          placeholder: 'Ej: Con energía 💪',
          attributes: { maxlength: 50 }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.estadoCustom?.trim()) {
              await this.showToast('Escribe un estado válido', 'warning');
              return false;
            }

            await this.saveEstado(data.estadoCustom.trim());
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async saveEstado(estado: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Guardando estado...'
    });

    await loading.present();

    await this.authService.updateProfile({ estado });

    if (this.userData) {
      this.userData.estado = estado;
    }

    await loading.dismiss();
    await this.showToast('Estado actualizado', 'success');
  }

  // =========================
  // 🍞 TOAST
  // =========================
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });

    await toast.present();
  }

  // ✏️ CAMBIAR NOMBRE DE USUARIO
  async onEditNombre() {
    if (!this.userData) return;

    // ✅ Verificar si han pasado 90 días desde el último cambio
    if (this.userData.ultimoCambioNombre) {
      const ultimoCambio = new Date(this.userData.ultimoCambioNombre);
      const hoy = new Date();
      const diasTranscurridos = Math.floor(
        (hoy.getTime() - ultimoCambio.getTime()) / (1000 * 60 * 60 * 24)
      );
      const diasRestantes = 90 - diasTranscurridos;

      if (diasRestantes > 0) {
        const alert = await this.alertCtrl.create({
          header: '⏳ Cambio no disponible',
          message: `Solo puedes cambiar tu nombre cada 90 días. Podrás cambiarlo en ${diasRestantes} día(s).`,
          buttons: ['Entendido']
        });
        await alert.present();
        return;
      }
    }

    // ✅ Advertencia de 90 días
    const advertencia = await this.alertCtrl.create({
      header: '⚠️ Antes de continuar',
      message: 'Solo puedes cambiar tu nombre de usuario una vez cada 90 días. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: () => this.mostrarFormCambioNombre()
        }
      ]
    });

    await advertencia.present();
  }

  // ✅ Formulario de cambio de nombre
  private async mostrarFormCambioNombre() {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar nombre de usuario',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          value: this.userData?.nombre || '',
          placeholder: 'Nuevo nombre de usuario',
          attributes: { maxlength: 30 }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const nuevoNombre = data.nombre?.trim();

            if (!nuevoNombre || nuevoNombre.length < 3) {
              await this.showToast('El nombre debe tener mínimo 3 caracteres', 'warning');
              return false;
            }

            if (nuevoNombre === this.userData?.nombre) {
              await this.showToast('El nombre es igual al actual', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Verificando...' });
            await loading.present();

            try {
              // ✅ Verificar si el nombre está disponible
              const disponible = await this.authService.isNombreDisponible(nuevoNombre);

              if (!disponible) {
                await loading.dismiss();
                await this.showToast('Este nombre ya está en uso', 'danger');
                return false;
              }

              // ✅ Guardar nuevo nombre con fecha de cambio
              await this.authService.updateProfile({
                nombre: nuevoNombre,
                ultimoCambioNombre: new Date().toISOString()
              });

              if (this.userData) {
                this.userData.nombre = nuevoNombre;
                this.userData.ultimoCambioNombre = new Date().toISOString();
              }

              await loading.dismiss();
              await this.showToast('Nombre actualizado correctamente', 'success');

            } catch (error) {
              await loading.dismiss();
              await this.showToast('Error al actualizar el nombre', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  // ✅ Calcular días restantes para cambio de nombre
  getDiasRestantesCambioNombre(): number {
    if (!this.userData?.ultimoCambioNombre) return 0;

    const ultimoCambio = new Date(this.userData.ultimoCambioNombre);
    const hoy = new Date();
    const diasTranscurridos = Math.floor(
      (hoy.getTime() - ultimoCambio.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, 90 - diasTranscurridos);
  }

  // =========================
  // 📜 SCROLL
  // =========================
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.hideHeader = scrollTop > this.lastScrollTop && scrollTop > 50;
    this.lastScrollTop = scrollTop;
  }
}