// src/app/core/services/auth.service.ts

// 🔹 Importaciones principales de Angular
import { Injectable } from '@angular/core';

// 🔹 Funciones de autenticación de Firebase
import {
  Auth,
  createUserWithEmailAndPassword, // Crear usuario con email y contraseña
  signInWithEmailAndPassword,      // Iniciar sesión
  signOut,                         // Cerrar sesión
  user,                            // Obtener usuario autenticado como observable
  updatePassword,                  // Actualizar contraseña
  reauthenticateWithCredential,    // Reautenticación del usuario
  EmailAuthProvider,               // Proveedor de credenciales email/password
  deleteUser                       // Eliminar usuario de Firebase Auth
} from '@angular/fire/auth';

// 🔹 Funciones de Firestore (base de datos)
import {
  Firestore,
  doc,             // Referencia a un documento
  setDoc,          // Crear o sobrescribir documento
  getDoc,          // Obtener documento
  collection,      // Referencia a colección
  collectionData,  // Obtener datos como observable
  updateDoc,       // Actualizar documento
  deleteDoc        // Eliminar documento
} from '@angular/fire/firestore';

// 🔹 RxJS para manejar observables
import { Observable, from } from 'rxjs';

// 🔹 Inyección moderna de dependencias
import { inject } from '@angular/core';

// 🔹 Envío de correo para recuperación de contraseña
import { sendPasswordResetEmail } from '@angular/fire/auth';

// 🔹 Interfaz que define la estructura del usuario en Firestore
export interface UserData {
  uid: string;                         // ID único del usuario
  email: string;                       // Correo electrónico
  nombre: string;                      // Nombre del usuario
  rol: 'admin' | 'user';               // Rol del usuario
  fotoBase64?: string;                 // Foto opcional en base64
  estado?: string;                     // Estado/mensaje del usuario
  preguntaSeguridad?: string;          // Pregunta de seguridad
  respuestaSeguridad?: string;         // Respuesta de seguridad
}

@Injectable({
  providedIn: 'root' // Hace que el servicio esté disponible en toda la app
})
export class AuthService {

  // 🔹 Inyección de servicios de Firebase
  private auth = inject(Auth);           // Servicio de autenticación
  private firestore = inject(Firestore); // Servicio de base de datos

  // 👤 Observable que emite el usuario autenticado en tiempo real
  currentUser$ = user(this.auth);

  // =========================
  // ✅ REGISTRO DE USUARIO
  // =========================
  async register(email: string, password: string, nombre: string, rol: 'admin' | 'user' = 'user'): Promise<void> {
    
    // Crear usuario en Firebase Auth
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    
    // Obtener UID del usuario creado
    const uid = credential.user.uid;

    // Crear referencia al documento en Firestore
    const userRef = doc(this.firestore, `usuarios/${uid}`);

    // Guardar datos adicionales del usuario en Firestore
    await setDoc(userRef, {
      uid,
      email,
      nombre,
      rol
    } as UserData);
  }

  // =========================
  // ✅ LOGIN
  // =========================
  async login(email: string, password: string): Promise<void> {
    
    // Inicia sesión con email y contraseña
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  // =========================
  // ✅ LOGOUT
  // =========================
  async logout(): Promise<void> {
    
    // Cierra la sesión del usuario actual
    await signOut(this.auth);
  }

  // =========================
  // ✅ OBTENER ROL DEL USUARIO
  // =========================
  async getUserRole(): Promise<'admin' | 'user' | null> {
    
    // Obtener usuario autenticado
    const currentUser = this.auth.currentUser;

    // Si no hay usuario, retornar null
    if (!currentUser) return null;

    // Referencia al documento del usuario
    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);

    // Obtener datos del usuario
    const userSnap = await getDoc(userRef);

    // Verificar si existe el documento
    if (userSnap.exists()) {
      const data = userSnap.data() as UserData;
      return data.rol; // Retornar el rol
    }

    return null;
  }

  // =========================
  // ✅ OBTENER DATOS COMPLETOS DEL USUARIO
  // =========================
  async getCurrentUserData(): Promise<UserData | null> {
    
    const currentUser = this.auth.currentUser;

    // Validar si hay usuario logueado
    if (!currentUser) return null;

    // Referencia al usuario en Firestore
    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);

    // Obtener documento
    const userSnap = await getDoc(userRef);

    // Retornar datos si existen
    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }

    return null;
  }

  // =========================
  // ✅ OBTENER TODOS LOS USUARIOS (ADMIN)
  // =========================
  getAllUsers(): Observable<UserData[]> {
    
    // Referencia a la colección "usuarios"
    const usuariosRef = collection(this.firestore, 'usuarios');

    // Retorna los datos en tiempo real como observable
    return collectionData(usuariosRef) as Observable<UserData[]>;
  }

  // =========================
  // ✅ ACTUALIZAR ROL
  // =========================
  async updateUserRole(uid: string, nuevoRol: 'admin' | 'user'): Promise<void> {
    
    // Referencia al usuario
    const userRef = doc(this.firestore, `usuarios/${uid}`);

    // Actualiza el campo rol
    await updateDoc(userRef, { rol: nuevoRol });
  }

  // =========================
  // ✅ ACTUALIZAR PERFIL
  // =========================
  async updateProfile(data: Partial<UserData>): Promise<void> {
    
    const currentUser = this.auth.currentUser;

    // Validar usuario
    if (!currentUser) return;

    // Referencia al documento
    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);

    // Actualiza los campos enviados (nombre, foto, etc.)
    await updateDoc(userRef, { ...data });
  }

  // =========================
  // ✅ CAMBIAR CONTRASEÑA
  // =========================
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    
    const currentUser = this.auth.currentUser;

    // Validar usuario autenticado
    if (!currentUser || !currentUser.email) throw new Error('No hay usuario autenticado');

    // 🔐 Crear credencial con contraseña actual
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);

    // 🔐 Reautenticar usuario (requerido por seguridad)
    await reauthenticateWithCredential(currentUser, credential);

    // 🔄 Actualizar contraseña
    await updatePassword(currentUser, newPassword);
  }

  // =========================
  // ✅ VERIFICAR SESIÓN
  // =========================
  isLoggedIn(): boolean {
    
    // Retorna true si existe usuario autenticado
    return !!this.auth.currentUser;
  }

  // =========================
  // ✅ RECUPERAR CONTRASEÑA
  // =========================
  async resetPassword(email: string): Promise<void> {
    
    // Envía correo para restablecer contraseña
    await sendPasswordResetEmail(this.auth, email);
  }

  // =========================
  // ✅ ELIMINAR CUENTA
  // =========================
  async deleteAccount(password: string, respuesta: string): Promise<void> {
    
    const currentUser = this.auth.currentUser;

    // Validar usuario autenticado
    if (!currentUser || !currentUser.email) throw new Error('No hay usuario autenticado');

    // Referencia al usuario en Firestore
    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);

    // Obtener datos del usuario
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) throw new Error('Usuario no encontrado');

    const userData = userSnap.data() as UserData;

    // Normalizar respuestas (minúsculas y sin espacios)
    const respuestaGuardada = userData.respuestaSeguridad?.toLowerCase().trim();
    const respuestaIngresada = respuesta.toLowerCase().trim();

    // Validar respuesta de seguridad
    if (respuestaGuardada !== respuestaIngresada) {
      throw new Error('respuesta-incorrecta');
    }

    // 🔐 Reautenticación antes de eliminar
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);

    // 🗑️ Eliminar documento del usuario en Firestore
    await deleteDoc(userRef);

    // ❌ Eliminar cuenta de Firebase Auth
    await deleteUser(currentUser);
  }
}