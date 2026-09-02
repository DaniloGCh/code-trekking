// =========================
// 🔹 IMPORTACIONES ANGULAR
// =========================
import { Injectable, inject } from '@angular/core';

// =========================
// 🔹 FIREBASE AUTH
// =========================
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  user,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendPasswordResetEmail,
  User
} from '@angular/fire/auth';

// =========================
// 🔹 FIRESTORE
// =========================
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  collection,
  collectionData,
  updateDoc,
  deleteDoc,
  addDoc
} from '@angular/fire/firestore';

// =========================
// 🔹 RXJS
// =========================
import { Observable } from 'rxjs';
import { SecurityService } from './security.service';
import { environment } from 'src/environments/environment';

export interface ContactoEmergencia {
  nombre: string;
  telefono: string;
}

// =========================
// 📊 ESTADÍSTICAS USUARIO
// =========================
export interface EstadisticasUsuario {
  eventosCreados: number;
  eventosCreadosMes: number;
  ultimoMes: string;
}

// =========================
// 💳 MODELO SUSCRIPCIÓN Y PAGOS
// =========================
export interface SuscripcionData {
  activa: boolean;
  plan: 'mensual' | 'trimestral' | 'anual' | null;
  monto?: number;
  fechaInicio: string;
  fechaVencimiento: string;
  fechaFin?: string | any;
  nombrePlan?: string;
  planNombre?: string;
  ordenId?: string;
}

export interface RegistroPago {
  monto: number;
  plan: 'mensual' | 'trimestral' | 'anual';
  ordenId: string;
  fechaPago: string;
  uid: string;
}

// =========================
// 👤 MODELO USUARIO
// =========================
export interface UserData {
  uid: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'user';

  fotoBase64?: string;
  estado?: string;

  sobreMi?: string;
  ocupacion?: string;
  lugarSonado?: string;
  mascotas?: string;
  actividadesFavoritas?: string;
  trekkingFavorito?: string;
  proximoDesafio?: string;

  preguntaSeguridad?: string;
  respuestaSeguridad?: string;
  contactosEmergencia?: ContactoEmergencia[];
  ultimoCambioNombre?: string;

  estadisticas?: EstadisticasUsuario;

  terminosAceptados?: boolean;
  fechaAceptacionTerminos?: string;
  versionTerminos?: string;

  suscripcion?: SuscripcionData;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private security = inject(SecurityService);

  private loginAttempts = 0;
  private lastLoginAttempt = 0;

  private static readonly MESES_POR_PLAN: Record<string, number> = {
    mensual: 1,
    trimestral: 4,
    anual: 12
  };

  private static readonly MONTOS_POR_PLAN: Record<string, number> = {
    mensual: 4000,
    trimestral: 13350,
    anual: 39000
  };

  private static readonly DIAS_GRACIA = 5;

  readonly currentUser$: Observable<User | null> = user(this.auth);

  async register(
    email: string,
    password: string,
    nombre: string,
    rol: 'admin' | 'user' = 'user',
    terminosAceptados: boolean = false
  ): Promise<void> {

    if (!this.security.isValidEmail(email)) {
      throw new Error('invalid-email');
    }

    if (!this.security.isSafeText(nombre, 50)) {
      throw new Error('invalid-nombre');
    }

    const passwordCheck = this.security.isStrongPassword(password);

    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.message);
    }

    if (!terminosAceptados) {
      throw new Error('terminos-no-aceptados');
    }

    const nombreSeguro = this.security.sanitizeInput(nombre);

    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    const uid = credential.user.uid;

    const userRef = doc(
      this.firestore,
      `usuarios/${uid}`
    );

    await setDoc(userRef, {
      uid,
      email,
      nombre: nombreSeguro,
      rol,
      fotoBase64: '',
      estado: '',
      creadoEn: new Date().toISOString(),
      estadisticas: {
        eventosCreados: 0,
        eventosCreadosMes: 0,
        ultimoMes: new Date().toISOString().substring(0, 7)
      },
      terminosAceptados: terminosAceptados,
      fechaAceptacionTerminos: new Date().toISOString(),
      versionTerminos: '1.0'
    } as UserData);
  }

  async login(email: string, password: string): Promise<void> {
    if (!this.security.checkRateLimit('login', 5, 60000)) {
      throw new Error('too-many-attempts');
    }

    if (!this.security.isValidEmail(email)) {
      throw new Error('invalid-email');
    }

    await signInWithEmailAndPassword(this.auth, email, password);
    this.security.resetRateLimit('login');
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  async getCurrentUserData(): Promise<UserData | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    
    try {
      // 🔹 Forzamos la descarga desde Firestore (sin usar caché)
      const userSnap = await getDocFromServer(userRef);
      return userSnap.exists() ? (userSnap.data() as UserData) : null;
    } catch {
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? (userSnap.data() as UserData) : null;
    }
  }

  async getUserRole(): Promise<'admin' | 'user' | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    const userSnap = await getDoc(userRef);

    return userSnap.exists()
      ? (userSnap.data() as UserData).rol
      : null;
  }

  getAllUsers(): Observable<UserData[]> {
    const ref = collection(this.firestore, 'usuarios');
    return collectionData(ref) as Observable<UserData[]>;
  }

  async incrementarEventosCreados(): Promise<void> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      throw new Error('No hay usuario autenticado');
    }

    const userRef = doc(
      this.firestore,
      `usuarios/${currentUser.uid}`
    );

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }

    const userData = userSnap.data() as UserData;

    const mesActual = new Date()
      .toISOString()
      .substring(0, 7);

    const estadisticasActuales = userData.estadisticas ?? {
      eventosCreados: 0,
      eventosCreadosMes: 0,
      ultimoMes: mesActual
    };

    let eventosCreadosMes =
      estadisticasActuales.eventosCreadosMes ?? 0;

    if (estadisticasActuales.ultimoMes !== mesActual) {
      eventosCreadosMes = 0;
    }

    await updateDoc(userRef, {
      'estadisticas.eventosCreados':
        (estadisticasActuales.eventosCreados ?? 0) + 1,

      'estadisticas.eventosCreadosMes':
        eventosCreadosMes + 1,

      'estadisticas.ultimoMes':
        mesActual
    });
  }

  async updateUserRole(uid: string, nuevoRol: 'admin' | 'user'): Promise<void> {
    const userRef = doc(this.firestore, `usuarios/${uid}`);
    await updateDoc(userRef, { rol: nuevoRol });
  }

  async updateProfile(data: Partial<UserData>): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    await updateDoc(userRef, { ...data });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('No hay usuario autenticado');
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );

    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  async deleteAccount(password: string, respuesta: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.email) {
      throw new Error('No hay usuario autenticado');
    }

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }

    const userData = userSnap.data() as UserData;

    const respuestaGuardada = userData.respuestaSeguridad?.toLowerCase().trim();
    const respuestaIngresada = respuesta.toLowerCase().trim();

    if (respuestaGuardada !== respuestaIngresada) {
      throw new Error('respuesta-incorrecta');
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      password
    );

    await reauthenticateWithCredential(currentUser, credential);
    await deleteDoc(userRef);
    await deleteUser(currentUser);
  }

  async isNombreDisponible(nombre: string): Promise<boolean> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const snapshot = await getDocs(usuariosRef);
    const nombres = snapshot.docs.map(d => (d.data() as UserData).nombre?.toLowerCase().trim());
    return !nombres.includes(nombre.toLowerCase().trim());
  }

  private parseFecha(raw: any): Date | null {
    if (!raw) return null;
    if (typeof raw.toDate === 'function') return raw.toDate();
    const dateObj = new Date(raw);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  // 🔹 Función modificada para sumar tiempo acumulativo y montos
  async activarSuscripcion(
    plan: 'mensual' | 'trimestral' | 'anual',
    ordenId: string
  ): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const mesesASumar = AuthService.MESES_POR_PLAN[plan] ?? 1;
    const montoNuevo = AuthService.MONTOS_POR_PLAN[plan] ?? 0;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    
    // Obtenemos el documento síncrono desde el servidor
    let userSnap;
    try {
      userSnap = await getDocFromServer(userRef);
    } catch {
      userSnap = await getDoc(userRef);
    }

    const userData = userSnap.exists() ? (userSnap.data() as UserData) : null;
    const subActual = userData?.suscripcion;

    const ahora = new Date();
    let fechaBase = ahora;

    // Si ya existe una suscripción activa y no ha vencido, extendemos desde la fecha de vencimiento actual
    if (subActual && subActual.activa) {
      const rawVencimiento = subActual.fechaVencimiento || subActual.fechaFin;
      const vencimientoActual = this.parseFecha(rawVencimiento);

      if (vencimientoActual && vencimientoActual > ahora) {
        fechaBase = vencimientoActual;
      }
    }

    // Calculamos la nueva fecha sumando los meses
    const nuevaFechaVencimiento = new Date(fechaBase);
    nuevaFechaVencimiento.setMonth(nuevaFechaVencimiento.getMonth() + mesesASumar);

    const isoVencimiento = nuevaFechaVencimiento.toISOString();
    const montoAcumulado = (subActual?.monto || 0) + montoNuevo;

    const suscripcion: SuscripcionData = {
      activa: true,
      plan,
      monto: montoAcumulado,
      fechaInicio: subActual?.fechaInicio || ahora.toISOString(),
      fechaVencimiento: isoVencimiento,
      fechaFin: isoVencimiento,
      nombrePlan: `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
      ordenId
    };

    await updateDoc(userRef, { suscripcion });

    // Historial individual de pago
    const pagosRef = collection(this.firestore, `usuarios/${currentUser.uid}/pagos`);
    const registroPago: RegistroPago = {
      monto: montoNuevo,
      plan,
      ordenId,
      fechaPago: ahora.toISOString(),
      uid: currentUser.uid
    };

    await addDoc(pagosRef, registroPago);
  }

  async verificarYActualizarSuscripcion(): Promise<SuscripcionData | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    
    let userSnap;
    try {
      // 🔹 Forzamos la descarga desde Firestore
      userSnap = await getDocFromServer(userRef);
    } catch {
      userSnap = await getDoc(userRef);
    }

    if (!userSnap.exists()) return null;

    const data = userSnap.data() as UserData;
    const sub = data.suscripcion;
    const rawFecha = sub?.fechaVencimiento || sub?.fechaFin;

    if (!sub || !sub.activa || !rawFecha) return sub ?? null;

    const vencimiento = this.parseFecha(rawFecha);
    if (!vencimiento) return sub;

    const limiteConGracia = new Date(vencimiento);
    limiteConGracia.setDate(limiteConGracia.getDate() + AuthService.DIAS_GRACIA);

    if (new Date() > limiteConGracia) {
      await updateDoc(userRef, { 'suscripcion.activa': false });
      return { ...sub, activa: false };
    }

    return sub;
  }

  diasRestantesDeGracia(sub: SuscripcionData | null | undefined): number | null {
    const rawFecha = sub?.fechaVencimiento || sub?.fechaFin;
    if (!sub || !rawFecha) return null;

    const vencimiento = this.parseFecha(rawFecha);
    if (!vencimiento) return null;

    const limiteConGracia = new Date(vencimiento);
    limiteConGracia.setDate(limiteConGracia.getDate() + AuthService.DIAS_GRACIA);

    const ahora = new Date();
    if (ahora <= vencimiento || ahora > limiteConGracia) return null;

    const msRestantes = limiteConGracia.getTime() - ahora.getTime();
    return Math.ceil(msRestantes / (1000 * 60 * 60 * 24));
  }

  private log(mensaje: string, data?: any) {
    if (!environment.production) {
      console.log(`[AuthService] ${mensaje}`, data ?? '');
    }
  }
}