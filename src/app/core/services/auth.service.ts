// src/app/core/services/auth.service.ts

import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore,  doc, setDoc, getDoc, collection, collectionData, updateDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { inject } from '@angular/core';

export interface UserData {
  uid: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'user';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);

  // 👤 Observable del usuario autenticado
  currentUser$ = user(this.auth);

  // ✅ REGISTRO
  async register(email: string, password: string, nombre: string, rol: 'admin' | 'user' = 'user'): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = credential.user.uid;

    // Guardar datos del usuario en Firestore
    const userRef = doc(this.firestore, `usuarios/${uid}`);
    await setDoc(userRef, {
      uid,
      email,
      nombre,
      rol
    } as UserData);
  }

  // ✅ LOGIN
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  // ✅ LOGOUT
  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  // ✅ OBTENER ROL DEL USUARIO ACTUAL
  async getUserRole(): Promise<'admin' | 'user' | null> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserData;
      return data.rol;
    }

    return null;
  }

  // ✅ OBTENER DATOS COMPLETOS DEL USUARIO ACTUAL
  async getCurrentUserData(): Promise<UserData | null> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) return null;

    const userRef = doc(this.firestore, `usuarios/${currentUser.uid}`);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }

    return null;
  }


  // ✅ OBTENER TODOS LOS USUARIOS (para el admin)
  getAllUsers(): Observable<UserData[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return collectionData(usuariosRef) as Observable<UserData[]>;
  }

  // ✅ CAMBIAR ROL DE UN USUARIO
  async updateUserRole(uid: string, nuevoRol: 'admin' | 'user'): Promise<void> {
    const userRef = doc(this.firestore, `usuarios/${uid}`);
    await updateDoc(userRef, { rol: nuevoRol });
  }

  // ✅ VERIFICAR SI HAY SESIÓN ACTIVA
  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }
}