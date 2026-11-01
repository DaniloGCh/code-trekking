import { Component, Input, inject, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { TerminosService, TerminosVigentes } from 'src/app/core/services/terminos.service';
import { TERMINOS_BASE_INTRODUCCION, TERMINOS_BASE_SECCIONES } from './terminos-base';
import { BloqueTexto, SeccionRender, parsearBloques, prepararSecciones } from './terminos-formato';

/**
 * - consulta:    se puede cerrar sin aceptar (registro, Configuración, aviso, pagos).
 * - obligatorio: modal bloqueante; solo se sale aceptando o cerrando sesión.
 */
export type ModoTerminosModal = 'consulta' | 'obligatorio';

@Component({
  selector: 'app-terminos-modal',
  templateUrl: './terminos-modal.component.html',
  styleUrls: ['./terminos-modal.component.scss'],
  standalone: false,
})
export class TerminosModalComponent implements OnInit {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================

  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private authService = inject(AuthService);
  private terminosService = inject(TerminosService);


  // =========================
  // 📥 ENTRADAS
  // =========================

  @Input() modo: ModoTerminosModal = 'consulta';

  /** Mensaje opcional que explica por qué se pide aceptar (ej. antes de pagar). */
  @Input() motivo?: string;

  /** Borrador del admin: se muestra tal cual, sin estado de aceptación ni acciones. */
  @Input() vistaPrevia?: TerminosVigentes;


  // =========================
  // 📄 TÉRMINOS
  // =========================

  cargando = true;
  guardando = false;

  vigentes: TerminosVigentes = {
    version: TerminosService.VERSION_BASE,
    fechaPublicacion: null,
    contenido: null
  };

  /** Hay sesión iniciada (en el registro todavía no la hay). */
  usuarioAutenticado = false;
  esAdmin = false;

  versionAceptada?: string;
  fechaAceptacion?: string;

  /** El usuario ya aceptó la versión vigente. */
  terminosAceptados = false;

  // 📝 Texto ya preparado para pintar
  introduccionBloques: BloqueTexto[] = [];
  seccionesRender: SeccionRender[] = [];

  get esObligatorio(): boolean {
    return this.modo === 'obligatorio';
  }

  /** Aceptó una versión anterior a la vigente. */
  get aceptoVersionAnterior(): boolean {
    return !!this.versionAceptada && !this.terminosAceptados;
  }


  // =========================
  // 🚀 INICIALIZACIÓN
  // =========================

  async ngOnInit() {

    if (this.vistaPrevia) {
      this.vigentes = this.vistaPrevia;
      this.prepararTexto();
      this.cargando = false;
      return;
    }

    try {

      const [vigentes, userData] = await Promise.all([
        this.terminosService.obtenerVigentes(),
        this.authService.getCurrentUserData()
      ]);

      this.vigentes = vigentes;
      this.prepararTexto();

      if (userData) {

        this.usuarioAutenticado = true;
        this.esAdmin = this.terminosService.estaExento(userData);

        if (userData.terminosAceptados) {
          this.versionAceptada = userData.versionTerminos ?? TerminosService.VERSION_BASE;
          this.fechaAceptacion = userData.fechaAceptacionTerminos;
        }

        this.terminosAceptados =
          this.terminosService.aceptoVersionVigente(userData, vigentes);

      }

    } catch (error) {

      console.error(
        'Error al cargar el estado de los términos:',
        error
      );

      this.prepararTexto();

    } finally {

      this.cargando = false;

    }

  }


  // =========================
  // 📝 TEXTO A MOSTRAR
  // =========================

  private prepararTexto() {

    const { secciones, introduccion, contenido, version } = this.vigentes;

    if (secciones?.length) {

      // Secciones publicadas por el admin
      this.introduccionBloques = parsearBloques(introduccion);
      this.seccionesRender = prepararSecciones(secciones);

    } else if (contenido) {

      // Formato anterior: un único texto plano
      this.introduccionBloques = [];
      this.seccionesRender = prepararSecciones([
        { numero: `V${version}`, titulo: 'Texto vigente', contenido }
      ]);

    } else {

      // Texto base (versión inicial)
      this.introduccionBloques = parsearBloques(TERMINOS_BASE_INTRODUCCION);
      this.seccionesRender = prepararSecciones(TERMINOS_BASE_SECCIONES);

    }

  }


  // =========================
  // ❌ CERRAR
  // =========================

  cerrar() {

    if (this.esObligatorio) return;

    this.modalCtrl.dismiss({
      aceptado: this.terminosAceptados
    }, 'cerrar');

  }


  // =========================
  // 🚪 CERRAR SESIÓN (MODO OBLIGATORIO)
  // =========================

  cerrarSesion() {

    this.modalCtrl.dismiss({ aceptado: false }, 'logout');

  }


  // =========================
  // ✅ ACEPTAR TÉRMINOS
  // =========================

  async aceptar() {

    if (this.guardando) return;
    this.guardando = true;

    try {

      // 💾 Guardar aceptación en Firebase (en el registro aún no hay sesión:
      // la aceptación se guarda al crear la cuenta)
      const aceptacion = await this.terminosService.aceptarVersionVigente(this.vigentes);

      const fechaAceptacion = aceptacion?.fecha ?? new Date().toISOString();

      // 🔄 Actualizar inmediatamente el estado local
      this.terminosAceptados = true;
      this.versionAceptada = this.vigentes.version;
      this.fechaAceptacion = fechaAceptacion;


      // 📤 Informar a la pantalla que abrió el modal
      await this.modalCtrl.dismiss({

        aceptado: true,

        fechaAceptacionTerminos: fechaAceptacion,

        versionTerminos: this.vigentes.version

      }, 'aceptado');

    } catch (error) {

      console.error(
        'Error al guardar la aceptación de términos:',
        error
      );

      const toast = await this.toastCtrl.create({
        message: 'No se pudo guardar la aceptación. Revisa tu conexión e inténtalo nuevamente.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();

    } finally {

      this.guardando = false;

    }

  }


  // =========================
  // 📅 FORMATO DE FECHAS
  // =========================

  formatearFecha(fecha?: string | null): string {

    if (!fecha) return 'No disponible';

    const fechaLocal = new Date(fecha);
    if (isNaN(fechaLocal.getTime())) return 'No disponible';

    return fechaLocal.toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

  }

}
