// =========================
// 🔹 IMPORTACIONES ANGULAR
// =========================
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';

import { AuthService } from './auth.service';
import { TerminosService, TerminosVigentes } from './terminos.service';
import { TerminosModalComponent } from 'src/app/components/terminos-modal/terminos-modal.component';

export interface EstadoTerminosUsuario {
  vigentes: TerminosVigentes;
  /** Rol admin: administra los términos, nunca se le exigen. */
  exento: boolean;
  /** Aceptó la versión vigente (o está exento). */
  alDia: boolean;
  /** Tiene una suscripción activa (incluye los días de gracia). */
  pagoVigente: boolean;
}

/**
 * Controla la re-aceptación de los términos cuando el admin publica una
 * nueva versión:
 * - Sin pago vigente  → modal bloqueante hasta aceptar (o cerrar sesión).
 * - Con pago vigente  → aviso no bloqueante, conserva su acceso pagado.
 * - Rol admin         → exento.
 * - Antes de pagar    → se exige aceptar la versión vigente.
 */
@Injectable({
  providedIn: 'root'
})
export class TerminosControlService {

  private auth = inject(Auth);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private authService = inject(AuthService);
  private terminosService = inject(TerminosService);

  /** Pantallas donde no se interrumpe al usuario. */
  private static readonly RUTAS_EXCLUIDAS = ['/login', '/register', '/error'];

  /** Evita consultar Firestore en cada navegación. */
  private static readonly INTERVALO_VERIFICACION_MS = 60000;

  private modalAbierto = false;
  private verificando = false;
  private uidVerificado: string | null = null;
  private ultimaVerificacion = 0;

  /** Avisos no bloqueantes ya mostrados en la sesión (uid:versión). */
  private avisosMostrados = new Set<string>();

  // =========================
  // 📊 ESTADO DEL USUARIO
  // =========================

  async obtenerEstado(): Promise<EstadoTerminosUsuario | null> {
    const [userData, vigentes] = await Promise.all([
      this.authService.getCurrentUserData(),
      this.terminosService.obtenerVigentes()
    ]);

    if (!userData) return null;

    const exento = this.terminosService.estaExento(userData);
    const alDia = exento || this.terminosService.aceptoVersionVigente(userData, vigentes);

    // La suscripción solo importa si debe re-aceptar
    let pagoVigente = false;
    if (!alDia) {
      const sub = await this.authService.verificarYActualizarSuscripcion();
      pagoVigente = !!sub?.activa;
    }

    return { vigentes, exento, alDia, pagoVigente };
  }

  // =========================
  // 🧭 VERIFICACIÓN AL INICIAR SESIÓN / NAVEGAR
  // =========================

  async verificarAlNavegar(url: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    if (this.esRutaExcluida(url)) return;
    if (this.modalAbierto || this.verificando) return;

    const vigenteEnCache =
      this.uidVerificado === user.uid &&
      Date.now() - this.ultimaVerificacion < TerminosControlService.INTERVALO_VERIFICACION_MS;

    if (vigenteEnCache) return;

    this.verificando = true;

    try {
      const estado = await this.obtenerEstado();

      // Documento del usuario aún no creado (ej. en pleno registro)
      if (!estado || this.auth.currentUser?.uid !== user.uid) return;

      this.uidVerificado = user.uid;
      this.ultimaVerificacion = Date.now();

      if (estado.alDia) return;

      if (estado.pagoVigente) {
        await this.mostrarAvisoNoBloqueante(user.uid, estado.vigentes);
        return;
      }

      await this.exigirAceptacionBloqueante();

    } catch (error) {
      console.warn('[TerminosControlService] No se pudo verificar los términos:', error);
    } finally {
      this.verificando = false;
    }
  }

  /** Limpia el estado al cerrar sesión o tras una aceptación. */
  reiniciar(): void {
    this.uidVerificado = null;
    this.ultimaVerificacion = 0;
  }

  /** Al cerrar sesión se vuelven a mostrar los avisos en el próximo inicio. */
  reiniciarSesion(): void {
    this.reiniciar();
    this.avisosMostrados.clear();
  }

  // =========================
  // 🔒 MODAL BLOQUEANTE (SIN PAGO VIGENTE)
  // =========================

  private async exigirAceptacionBloqueante(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TerminosModalComponent,
      componentProps: {
        modo: 'obligatorio',
        motivo: 'Se publicó una nueva versión de los términos y condiciones. Debes aceptarla para seguir usando Code-Trekking.'
      },
      cssClass: 'terminos-modal',
      backdropDismiss: false,
      keyboardClose: false,
      // Solo se cierra aceptando o cerrando sesión (bloquea botón atrás y gestos)
      canDismiss: async (_data?: any, role?: string) => role === 'aceptado' || role === 'logout'
    });

    this.modalAbierto = true;
    await modal.present();

    const { role } = await modal.onDidDismiss();
    this.modalAbierto = false;

    if (role === 'aceptado') {
      this.ultimaVerificacion = Date.now();
      await this.mostrarToast('Gracias por aceptar la nueva versión de los términos.', 'success');
      return;
    }

    if (role === 'logout') {
      await this.authService.logout();
      this.reiniciarSesion();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  // =========================
  // 🔔 AVISO NO BLOQUEANTE (CON PAGO VIGENTE)
  // =========================

  private async mostrarAvisoNoBloqueante(uid: string, vigentes: TerminosVigentes): Promise<void> {
    const clave = `${uid}:${vigentes.version}`;
    if (this.avisosMostrados.has(clave)) return;
    this.avisosMostrados.add(clave);

    const toast = await this.toastCtrl.create({
      header: 'Nuevos términos y condiciones',
      message: `Se publicó la versión ${vigentes.version}. Tu plan pagado sigue activo; revísala y acéptala cuando puedas desde Configuración.`,
      color: 'warning',
      position: 'top',
      duration: 10000,
      buttons: [
        { text: 'Ver', handler: () => { this.abrirConsulta(); } },
        { text: 'Cerrar', role: 'cancel' }
      ]
    });

    await toast.present();
  }

  // =========================
  // 📄 CONSULTA (CERRABLE)
  // =========================

  /** Abre los términos en modo consulta. Devuelve true si el usuario los aceptó. */
  async abrirConsulta(motivo?: string): Promise<boolean> {
    if (this.modalAbierto) return false;

    const modal = await this.modalCtrl.create({
      component: TerminosModalComponent,
      componentProps: { modo: 'consulta', motivo },
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      cssClass: 'terminos-modal'
    });

    this.modalAbierto = true;
    await modal.present();

    const { data, role } = await modal.onDidDismiss();
    this.modalAbierto = false;

    if (role === 'aceptado') {
      this.reiniciar();
    }

    return !!data?.aceptado;
  }

  // =========================
  // 💳 ANTES DE PAGAR
  // =========================

  /** Exige la versión vigente antes de iniciar un pago. true = puede pagar. */
  async asegurarAceptacionParaPagar(): Promise<boolean> {
    const estado = await this.obtenerEstado();
    if (!estado) return false;
    if (estado.alDia) return true;

    return this.abrirConsulta(
      `Para pagar un plan debes aceptar la versión vigente (${estado.vigentes.version}) de los términos y condiciones.`
    );
  }

  // =========================
  // 🔧 UTILIDADES
  // =========================

  private esRutaExcluida(url: string): boolean {
    const ruta = (url || '').split('?')[0];
    return TerminosControlService.RUTAS_EXCLUIDAS.some(r => ruta === r || ruta.startsWith(`${r}/`));
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
