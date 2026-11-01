// =========================
// 🔹 IMPORTACIONES ANGULAR
// =========================
import { Injectable, inject } from '@angular/core';

// =========================
// 🔹 FIREBASE
// =========================
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion
} from '@angular/fire/firestore';
import { leerDocPreferirServidor } from '../utils/firestore-utils';

// =========================
// 📄 MODELO TÉRMINOS
// =========================

/**
 * Una sección de los términos. Formato de `contenido`: párrafos separados por
 * una línea en blanco, ítems de lista con "- " al inicio y **texto** para negritas.
 */
export interface SeccionTerminos {
  numero: string;
  titulo: string;
  contenido: string;
}

/** Documento `configuracion/terminos`: la versión vigente que publica el admin. */
export interface TerminosVigentes {
  version: string;
  fechaPublicacion: string | null;
  resumenCambios?: string;
  /** Texto introductorio y secciones publicados por el admin. Si no existen, rige el texto base. */
  introduccion?: string;
  secciones?: SeccionTerminos[];
  /** Formato anterior (texto plano único). Solo se lee por compatibilidad. */
  contenido?: string | null;
  publicadoPor?: string;
}

/** Registro de cada aceptación que hace el usuario (auditoría). */
export interface AceptacionTerminos {
  version: string;
  fecha: string;
}

/** Datos mínimos del usuario que se necesitan para evaluar los términos. */
export interface DatosAceptacionUsuario {
  rol?: 'admin' | 'user';
  terminosAceptados?: boolean;
  versionTerminos?: string;
  fechaAceptacionTerminos?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TerminosService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);

  /** Versión con la que nació la app (texto base del modal). */
  static readonly VERSION_BASE = '1.0';

  /** Formato aceptado para las versiones: 1, 1.1, 2.0.1 */
  static readonly FORMATO_VERSION = /^\d{1,3}(\.\d{1,3}){0,2}$/;

  private static readonly RUTA_DOC = 'configuracion/terminos';

  /** > 0 si `a` es mayor que `b`, 0 si son iguales y < 0 si es menor ("1.10" > "1.9"). */
  static compararVersiones(a: string, b: string): number {
    const partesA = a.split('.').map(Number);
    const partesB = b.split('.').map(Number);
    const largo = Math.max(partesA.length, partesB.length);

    for (let i = 0; i < largo; i++) {
      const diferencia = (partesA[i] || 0) - (partesB[i] || 0);
      if (diferencia !== 0) return diferencia;
    }
    return 0;
  }

  // =========================
  // 📖 VERSIÓN VIGENTE
  // =========================

  async obtenerVigentes(): Promise<TerminosVigentes> {
    const ref = doc(this.firestore, TerminosService.RUTA_DOC);

    try {
      // 🔹 Desde el servidor para detectar al instante una versión recién publicada
      const snap = await leerDocPreferirServidor(ref);

      if (snap.exists()) {
        const data = snap.data() as TerminosVigentes;
        if (data.version) return data;
      }
    } catch (error) {
      console.warn('[TerminosService] No se pudo leer la versión vigente:', error);
    }

    // Sin documento publicado todavía: rige el texto base
    return {
      version: TerminosService.VERSION_BASE,
      fechaPublicacion: null,
      contenido: null
    };
  }

  // =========================
  // ✅ EVALUACIÓN
  // =========================

  /** true si el usuario aceptó exactamente la versión vigente. */
  aceptoVersionVigente(
    usuario: DatosAceptacionUsuario | null | undefined,
    vigentes: TerminosVigentes
  ): boolean {
    if (!usuario?.terminosAceptados) return false;
    const versionAceptada = usuario.versionTerminos ?? TerminosService.VERSION_BASE;
    return versionAceptada === vigentes.version;
  }

  /** El admin administra los términos, por lo que nunca se le exige aceptarlos. */
  estaExento(usuario: DatosAceptacionUsuario | null | undefined): boolean {
    return usuario?.rol === 'admin';
  }

  // =========================
  // ✍️ ACEPTAR VERSIÓN VIGENTE
  // =========================

  async aceptarVersionVigente(vigentes?: TerminosVigentes): Promise<AceptacionTerminos | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    const version = (vigentes ?? await this.obtenerVigentes()).version;
    const aceptacion: AceptacionTerminos = {
      version,
      fecha: new Date().toISOString()
    };

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    await updateDoc(userRef, {
      terminosAceptados: true,
      fechaAceptacionTerminos: aceptacion.fecha,
      versionTerminos: aceptacion.version,
      historialTerminos: arrayUnion(aceptacion)
    });

    return aceptacion;
  }

  // =========================
  // 🛠️ PUBLICAR NUEVA VERSIÓN (ADMIN)
  // =========================

  async publicarNuevaVersion(datos: {
    version: string;
    resumenCambios: string;
    introduccion: string;
    secciones: SeccionTerminos[];
  }): Promise<TerminosVigentes> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const actuales = await this.obtenerVigentes();

    if (!TerminosService.FORMATO_VERSION.test(datos.version)) {
      throw new Error('version-invalida');
    }

    if (TerminosService.compararVersiones(datos.version, actuales.version) <= 0) {
      throw new Error('version-no-mayor');
    }

    if (!datos.secciones.length) {
      throw new Error('sin-secciones');
    }

    const nuevos: TerminosVigentes = {
      version: datos.version,
      fechaPublicacion: new Date().toISOString(),
      resumenCambios: datos.resumenCambios,
      introduccion: datos.introduccion,
      secciones: datos.secciones,
      contenido: null,
      publicadoPor: currentUser.uid
    };

    await setDoc(doc(this.firestore, TerminosService.RUTA_DOC), nuevos);

    // Historial de versiones publicadas
    await setDoc(
      doc(this.firestore, `${TerminosService.RUTA_DOC}/versiones/${this.idVersion(nuevos.version)}`),
      nuevos
    );

    return nuevos;
  }

  /** Los puntos son válidos en un id de Firestore, pero se normalizan por legibilidad. */
  private idVersion(version: string): string {
    return `v${version.replace(/[^0-9a-zA-Z]/g, '_')}`;
  }
}
