// =========================
// 📦 IMPORTS
// =========================
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController, ToastController,
  LoadingController, ActionSheetController
} from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Firestore, collection, getDocs, deleteDoc, doc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

import { AuthService, UserData } from 'src/app/core/services/auth.service';
import { SecurityService } from 'src/app/core/services/security.service';
import { FotoService } from 'src/app/core/services/foto.service';

// ✅ Agrega el import
import { ModalController } from '@ionic/angular';



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
  private security = inject(SecurityService);
  private fotoService = inject(FotoService);
  private auth = inject(Auth);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private actionSheetCtrl = inject(ActionSheetController);
  private firestore = inject(Firestore);

  // ✅ Inyecta ModalController
  private modalCtrl = inject(ModalController);

  // =========================
  // 📊 ESTADO
  // =========================
  userData: UserData | null = null;
  favoritos: any[] = [];
  authReady = false;
  hideHeader = false;
  lastScrollTop = 0;
  // =========================
  // 📊 ESTADÍSTICAS
  // =========================
  eventosCreados = 0;
  eventosCreadosMes = 0;
  tiempoMiembro = '';

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
  // 🚀 INIT
  // =========================
  async ngOnInit() {
    this.authService.currentUser$.subscribe(async user => {
      this.authReady = true;

      if (user) {
        this.userData = await this.authService.getCurrentUserData();
        this.cargarEstadisticas();
        this.calcularTiempoMiembro();

        // ✅ Cargar foto desde localStorage
        const fotoGuardada = this.fotoService.cargarFoto(user.uid);
        if (fotoGuardada && this.userData) {
          this.userData.fotoBase64 = fotoGuardada;
        }

        await this.loadFavoritos();
      } else {
        this.userData = null;
        this.favoritos = [];
      }
    });
  }

  // =========================
  // 👤 EDITAR SOBRE MÍ
  // =========================
  async editarSobreMi(
    campo:
      | 'ocupacion'
      | 'lugarSonado'
      | 'mascotas'
      | 'actividadesFavoritas'
      | 'trekkingFavorito'
      | 'proximoDesafio'
      | 'sobreMi'
  ) {

    if (!this.userData) return;

    const configuracion = {
      ocupacion: {
        titulo: '💼 Ocupación',
        placeholder: 'Ej: Estudiante de informática',
        maxLength: 50
      },

      lugarSonado: {
        titulo: '🗺️ Lugar que siempre quise visitar',
        placeholder: 'Ej: Torres del Paine',
        maxLength: 80
      },

      mascotas: {
        titulo: '🐾 Mascotas',
        placeholder: 'Ej: Tengo 2 perros',
        maxLength: 80
      },

      actividadesFavoritas: {
        titulo: '🥾 Actividades favoritas',
        placeholder: 'Ej: Trekking, camping y fotografía',
        maxLength: 100
      },

      trekkingFavorito: {
        titulo: '🏔️ Trekking favorito',
        placeholder: 'Ej: Parque Nacional Conguillío',
        maxLength: 100
      },

      proximoDesafio: {
        titulo: '🎯 Próximo desafío',
        placeholder: 'Ej: Subir mi primer volcán',
        maxLength: 100
      },

      sobreMi: {
        titulo: '✍️ Sobre mí',
        placeholder: 'Cuéntanos algo sobre ti',
        maxLength: 200
      }
    };

    const config = configuracion[campo];

    const valorActual = this.userData[campo] || '';

    const alert = await this.alertCtrl.create({
      header: config.titulo,

      inputs: [
        {
          name: 'valor',
          type: campo === 'sobreMi' ? 'textarea' : 'text',
          value: valorActual,
          placeholder: config.placeholder,
          attributes: {
            maxlength: config.maxLength
          }
        }
      ],

      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },

        {
          text: valorActual ? 'Guardar' : 'Agregar',

          handler: async (data) => {

            const valor = data.valor?.trim() || '';

            // Permitir dejar el campo vacío
            if (!valor) {

              await this.authService.updateProfile({
                [campo]: ''
              });

              if (this.userData) {
                this.userData[campo] = '';
              }

              return true;
            }

            // 🔐 Validación de seguridad
            if (!this.security.isSafeText(valor, config.maxLength)) {

              await this.showToast(
                'El contenido contiene caracteres no permitidos',
                'warning'
              );

              return false;
            }

            // 🧹 Sanitización
            const valorSeguro = this.security.sanitizeInput(valor);

            try {

              await this.authService.updateProfile({
                [campo]: valorSeguro
              });

              if (this.userData) {
                this.userData[campo] = valorSeguro;
              }

              await this.showToast(
                'Información actualizada correctamente',
                'success'
              );

              return true;

            } catch {

              await this.showToast(
                'Error al actualizar la información',
                'danger'
              );

              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // =========================
  // 📊 ESTADÍSTICAS DEL USUARIO
  // =========================
  private cargarEstadisticas() {

    if (!this.userData) {
      this.eventosCreados = 0;
      this.eventosCreadosMes = 0;
      return;
    }

    const estadisticas = this.userData.estadisticas;

    this.eventosCreados = estadisticas?.eventosCreados ?? 0;

    const mesActual = new Date().toISOString().substring(0, 7);

    // Si las estadísticas pertenecen a otro mes,
    // mostramos 0 para el mes actual.
    if (estadisticas?.ultimoMes === mesActual) {
      this.eventosCreadosMes = estadisticas.eventosCreadosMes ?? 0;
    } else {
      this.eventosCreadosMes = 0;
    }
  }

  // =========================
  // ⏱️ TIEMPO COMO MIEMBRO
  // =========================
  private calcularTiempoMiembro() {

    const currentUser = this.auth.currentUser;

    if (!currentUser?.metadata.creationTime) {
      this.tiempoMiembro = 'No disponible';
      return;
    }

    const fechaRegistro = new Date(currentUser.metadata.creationTime);
    const ahora = new Date();

    let años = ahora.getFullYear() - fechaRegistro.getFullYear();
    let meses = ahora.getMonth() - fechaRegistro.getMonth();

    if (meses < 0) {
      años--;
      meses += 12;
    }

    // Ajustar si todavía no se cumple el día del mes
    if (ahora.getDate() < fechaRegistro.getDate()) {
      meses--;

      if (meses < 0) {
        años--;
        meses = 11;
      }
    }

    if (años > 0) {
      if (meses > 0) {
        this.tiempoMiembro =
          `${años} año${años !== 1 ? 's' : ''} y ${meses} mes${meses !== 1 ? 'es' : ''}`;
      } else {
        this.tiempoMiembro =
          `${años} año${años !== 1 ? 's' : ''}`;
      }

    } else if (meses > 0) {

      this.tiempoMiembro =
        `${meses} mes${meses !== 1 ? 'es' : ''}`;

    } else {

      const diferenciaDias = Math.floor(
        (ahora.getTime() - fechaRegistro.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      this.tiempoMiembro =
        `${Math.max(0, diferenciaDias)} día${diferenciaDias !== 1 ? 's' : ''}`;
    }
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
        quality: 90,           // ✅ Alta calidad inicial, comprimimos después
        allowEditing: true,    // ✅ Permite ajustar el ángulo antes de confirmar
        resultType: CameraResultType.Base64,
        source,

        // ✅ Opciones adicionales para mejor experiencia de edición
        correctOrientation: true, // ✅ Corrige orientación automáticamente
        presentationStyle: 'fullscreen', // ✅ Editor en pantalla completa
      });

      if (!image.base64String) return;

      const base64Original = `data:image/jpeg;base64,${image.base64String}`;

      // ✅ Validar foto
      const validacion = this.fotoService.validarFoto(base64Original);
      if (!validacion.valid) {
        await this.showToast(validacion.message, 'warning');
        return;
      }

      const loading = await this.loadingCtrl.create({ message: 'Procesando foto...' });
      await loading.present();

      try {
        // ✅ Comprimir foto automáticamente
        const base64Comprimida = await this.fotoService.comprimirFoto(base64Original);

        const uid = this.auth.currentUser?.uid;
        if (!uid) throw new Error('No autenticado');

        // ✅ Guardar en localStorage (preparado para Firebase Storage)
        const fotoGuardada = await this.fotoService.guardarFoto(uid, base64Comprimida);

        // ✅ Actualizar referencia en Firestore (solo uid, no el base64)
        // 🔥 Cuando migres a Storage, guarda aquí la URL de descarga
        await this.authService.updateProfile({ fotoBase64: fotoGuardada });

        if (this.userData) this.userData.fotoBase64 = fotoGuardada;

        await loading.dismiss();
        await this.showToast('Foto actualizada', 'success');

      } catch {
        await loading.dismiss();
        await this.showToast('Error al procesar la foto', 'danger');
      }

    } catch {
      await this.showToast('Error al obtener la foto', 'danger');
    }
  }

  // =========================
  // ⭐ FAVORITOS
  // =========================
  async loadFavoritos() {
    const user = this.auth.currentUser; // ✅ Usar auth inyectado, no acceso privado
    if (!user) return;

    try {
      const ref = collection(this.firestore, `usuarios/${user.uid}/favoritos`);
      const snap = await getDocs(ref);
      this.favoritos = snap.docs.map(d => ({ eventoId: d.id, ...d.data() }));
    } catch {
      await this.showToast('Error al cargar favoritos', 'danger');
    }
  }

  async removeFavorito(eventoId: string) {
    const user = this.auth.currentUser;
    if (!user) return;

    // ✅ Validar eventoId
    if (!eventoId || !this.security.isSafeText(eventoId, 50)) {
      await this.showToast('ID de favorito inválido', 'danger');
      return;
    }

    try {
      const ref = doc(this.firestore, `usuarios/${user.uid}/favoritos/${eventoId}`);
      await deleteDoc(ref);
      this.favoritos = this.favoritos.filter(f => f.eventoId !== eventoId);
      await this.showToast('Eliminado de favoritos', 'medium');
    } catch {
      await this.showToast('Error al eliminar favorito', 'danger');
    }
  }

  verEvento(id: string) {
    // ✅ Validar ID antes de navegar
    if (!id || !this.security.isSafeText(id, 50)) return;
    this.router.navigateByUrl(`/tabs/evento-detalle/${id}`);
  }

  // =========================
  // 🚪 AUTH
  // =========================
  async onLogout() {
    await this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  goLogin() { this.router.navigateByUrl('/login'); }
  goRegister() { this.router.navigateByUrl('/register'); }
  goHome() { this.router.navigateByUrl('/tabs/home'); }

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

            // ✅ Validar XSS en estado personalizado
            if (!this.security.isSafeText(data.estadoCustom, 50)) {
              await this.showToast('El estado contiene caracteres no permitidos', 'warning');
              return false;
            }

            await this.saveEstado(this.security.sanitizeInput(data.estadoCustom.trim()));
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async saveEstado(estado: string) {
    const loading = await this.loadingCtrl.create({ message: 'Guardando estado...' });
    await loading.present();

    try {
      await this.authService.updateProfile({ estado });
      if (this.userData) this.userData.estado = estado;
      await loading.dismiss();
      await this.showToast('Estado actualizado', 'success');
    } catch {
      await loading.dismiss();
      await this.showToast('Error al guardar estado', 'danger');
    }
  }

  // =========================
  // ✏️ CAMBIAR NOMBRE
  // =========================
  async onEditNombre() {
    if (!this.userData) return;

    if (this.userData.ultimoCambioNombre) {
      const diasTranscurridos = Math.floor(
        (new Date().getTime() - new Date(this.userData.ultimoCambioNombre).getTime())
        / (1000 * 60 * 60 * 24)
      );
      const diasRestantes = 90 - diasTranscurridos;

      if (diasRestantes > 0) {
        const alert = await this.alertCtrl.create({
          header: '⏳ Cambio no disponible',
          message: `Podrás cambiar tu nombre en ${diasRestantes} día(s).`,
          buttons: ['Entendido']
        });
        await alert.present();
        return;
      }
    }

    // ✅ Rate limiting
    if (!this.security.checkRateLimit('cambio-nombre', 3, 3600000)) {
      await this.showToast('Demasiados intentos. Espera 1 hora.', 'warning');
      return;
    }

    const advertencia = await this.alertCtrl.create({
      header: '⚠️ Antes de continuar',
      message: 'Solo puedes cambiar tu nombre una vez cada 90 días. ¿Deseas continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Continuar', handler: () => this.verificarPreguntaSeguridad() }
      ]
    });

    await advertencia.present();
  }

  private async verificarPreguntaSeguridad() {
    const alert = await this.alertCtrl.create({
      header: '🔐 Verificación de seguridad',
      message: `${this.security.sanitizeInput(this.userData?.preguntaSeguridad || '')}`,
      inputs: [
        { name: 'respuesta', type: 'text', placeholder: 'Tu respuesta de seguridad' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Siguiente',
          handler: async (data) => {
            if (!data.respuesta?.trim()) {
              await this.showToast('Ingresa tu respuesta de seguridad', 'warning');
              return false;
            }

            // ✅ Validar XSS en respuesta
            if (!this.security.isSafeText(data.respuesta, 100)) {
              await this.showToast('La respuesta contiene caracteres no permitidos', 'warning');
              return false;
            }

            const respuestaIngresada = data.respuesta.toLowerCase().trim();
            const respuestaGuardada = this.userData?.respuestaSeguridad?.toLowerCase().trim();

            if (respuestaGuardada !== respuestaIngresada) {
              await this.showToast('La respuesta de seguridad es incorrecta', 'danger');
              return false;
            }

            await this.verificarContrasena();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async verificarContrasena() {
    const alert = await this.alertCtrl.create({
      header: '🔑 Confirma tu contraseña',
      inputs: [
        { name: 'password', type: 'password', placeholder: 'Tu contraseña actual' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Siguiente',
          handler: async (data) => {
            if (!data.password) {
              await this.showToast('Ingresa tu contraseña', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Verificando...' });
            await loading.present();

            try {
              const { EmailAuthProvider, reauthenticateWithCredential } = await import('@angular/fire/auth');
              const currentUser = this.auth.currentUser;
              if (!currentUser?.email) throw new Error('No autenticado');

              const credential = EmailAuthProvider.credential(currentUser.email, data.password);
              await reauthenticateWithCredential(currentUser, credential);

              await loading.dismiss();
              await this.mostrarFormCambioNombre();

            } catch {
              await loading.dismiss();
              await this.showToast('Contraseña incorrecta', 'danger');
            }

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async mostrarFormCambioNombre() {
    const alert = await this.alertCtrl.create({
      header: '✏️ Cambiar nombre de usuario',
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

            // ✅ Validar nombre seguro
            if (!this.security.isValidNombre(nuevoNombre)) {
              await this.showToast('El nombre solo puede contener letras y espacios', 'warning');
              return false;
            }

            if (nuevoNombre === this.userData?.nombre) {
              await this.showToast('El nombre es igual al actual', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({ message: 'Verificando disponibilidad...' });
            await loading.present();

            try {
              const disponible = await this.authService.isNombreDisponible(nuevoNombre);

              if (!disponible) {
                await loading.dismiss();
                await this.showToast('Este nombre ya está en uso', 'danger');
                return false;
              }

              // ✅ Sanitizar antes de guardar
              const nombreSeguro = this.security.sanitizeInput(nuevoNombre);

              await this.authService.updateProfile({
                nombre: nombreSeguro,
                ultimoCambioNombre: new Date().toISOString()
              });

              if (this.userData) {
                this.userData.nombre = nombreSeguro;
                this.userData.ultimoCambioNombre = new Date().toISOString();
              }

              await loading.dismiss();
              await this.showToast('Nombre actualizado correctamente', 'success');

            } catch {
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

  getDiasRestantesCambioNombre(): number {
    if (!this.userData?.ultimoCambioNombre) return 0;
    const diasTranscurridos = Math.floor(
      (new Date().getTime() - new Date(this.userData.ultimoCambioNombre).getTime())
      / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 90 - diasTranscurridos);
  }

  // =========================
  // 🔐 SEGURIDAD DEL CORREO
  // =========================
  ocultarEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return 'Correo no disponible';
    }

    const [usuario, dominio] = email.split('@');

    // Si el usuario tiene solo 1 carácter
    if (usuario.length === 1) {
      return `${usuario}***@${dominio}`;
    }

    // Si tiene 2 caracteres, mostramos ambos
    if (usuario.length === 2) {
      return `${usuario[0]}*${usuario[1]}@${dominio}`;
    }

    // Caso normal
    const primeraLetra = usuario.charAt(0);
    const ultimaLetra = usuario.charAt(usuario.length - 1);

    return `${primeraLetra}***${ultimaLetra}@${dominio}`;
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
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}