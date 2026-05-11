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
  sendPasswordResetEmail
} from '@angular/fire/auth';

// =========================
// 🔹 FIRESTORE
// =========================
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  collectionData,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';

// =========================
// 🔹 RXJS
// =========================
import { Observable } from 'rxjs';

export interface ContactoEmergencia {
  nombre: string;
  telefono: string;
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
  preguntaSeguridad?: string;
  respuestaSeguridad?: string;
  contactosEmergencia?: ContactoEmergencia[]; // ✅ Nuevo
  ultimoCambioNombre?: string; // ✅ Fecha en ISO string
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  // =========================
  // 👤 USUARIO EN TIEMPO REAL
  // =========================
  currentUser$ = user(this.auth);

  // =========================
  // ✅ REGISTRO
  // =========================
  async register(
    email: string,
    password: string,
    nombre: string,
    rol: 'admin' | 'user' = 'user'
  ): Promise<void> {

    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    const uid = credential.user.uid;

    const userRef = doc(this.firestore, `usuarios/${uid}`);

    await setDoc(userRef, {
      uid,
      email,
      nombre,
      rol
    } as UserData);
  }

  // =========================
  // 🔑 LOGIN
  // =========================
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  // =========================
  // 🚪 LOGOUT
  // =========================
  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  // =========================
  // 👤 DATOS USUARIO
  // =========================
  async getCurrentUserData(): Promise<UserData | null> {

    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    const userSnap = await getDoc(userRef);

    return userSnap.exists()
      ? (userSnap.data() as UserData)
      : null;
  }

  // =========================
  // 🎭 ROL USUARIO
  // =========================
  async getUserRole(): Promise<'admin' | 'user' | null> {

    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    const userSnap = await getDoc(userRef);

    return userSnap.exists()
      ? (userSnap.data() as UserData).rol
      : null;
  }

  // =========================
  // 👥 TODOS LOS USUARIOS
  // =========================
  getAllUsers(): Observable<UserData[]> {
    const ref = collection(this.firestore, 'usuarios');
    return collectionData(ref) as Observable<UserData[]>;
  }

  // =========================
  // ✏️ ACTUALIZAR ROL
  // =========================
  async updateUserRole(uid: string, nuevoRol: 'admin' | 'user'): Promise<void> {
    const userRef = doc(this.firestore, `usuarios/${uid}`);
    await updateDoc(userRef, { rol: nuevoRol });
  }

  // =========================
  // 🧑 PERFIL
  // =========================
  async updateProfile(data: Partial<UserData>): Promise<void> {

    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    await updateDoc(userRef, { ...data });
  }

  // =========================
  // 🔒 CAMBIAR CONTRASEÑA
  // =========================
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

  // =========================
  // 🔁 RECUPERAR CONTRASEÑA
  // =========================
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  // =========================
  // 🔍 VERIFICAR SESIÓN
  // =========================
  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  // =========================
  // 🗑️ ELIMINAR CUENTA
  // =========================
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

  // ✅ VERIFICAR SI NOMBRE ESTÁ EN USO
async isNombreDisponible(nombre: string): Promise<boolean> {
  const usuariosRef = collection(this.firestore, 'usuarios');
  const snapshot = await getDocs(usuariosRef);
  const nombres = snapshot.docs.map(d => (d.data() as UserData).nombre?.toLowerCase().trim());
  return !nombres.includes(nombre.toLowerCase().trim());
}
}