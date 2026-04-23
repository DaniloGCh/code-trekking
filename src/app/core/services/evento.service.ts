// src/app/core/services/evento.service.ts

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, arrayUnion } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Evento, Lugar } from '../models/evento.model';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // ✅ OBTENER TODOS LOS LUGARES
  getLugares(): Observable<Lugar[]> {
    const lugaresRef = collection(this.firestore, 'lugares');
    return collectionData(lugaresRef, { idField: 'id' }) as Observable<Lugar[]>;
  }

  // ✅ GENERAR CÓDIGO DE INVITACIÓN ÚNICO
  private generarCodigo(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = 'TRK-';
    for (let i = 0; i < 6; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
  }

  // ✅ CREAR EVENTO
  async crearEvento(evento: Omit<Evento, 'id' | 'codigoInvitacion' | 'participantes' | 'creadoEn'>): Promise<string> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const eventosRef = collection(this.firestore, 'eventos');

    const nuevoEvento: Omit<Evento, 'id'> = {
      ...evento,
      codigoInvitacion: this.generarCodigo(),
      participantes: [currentUser.uid],
      creadoEn: new Date(),
    };

    const docRef = await addDoc(eventosRef, nuevoEvento);
    return docRef.id;
  }

  // ✅ OBTENER EVENTOS DEL USUARIO ACTUAL
  getMisEventos(): Observable<Evento[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return new Observable(sub => sub.next([]));

    const eventosRef = collection(this.firestore, 'eventos');
    const q = query(eventosRef, where('participantes', 'array-contains', currentUser.uid));
    return collectionData(q, { idField: 'id' }) as Observable<Evento[]>;
  }

  // ✅ OBTENER EVENTO POR ID
  async getEventoById(id: string): Promise<Evento | null> {
    const eventoRef = doc(this.firestore, `eventos/${id}`);
    const eventoSnap = await getDoc(eventoRef);
    if (eventoSnap.exists()) {
      return { id: eventoSnap.id, ...eventoSnap.data() } as Evento;
    }
    return null;
  }

  // ✅ UNIRSE A EVENTO POR CÓDIGO
  async unirseConCodigo(codigo: string): Promise<Evento | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const eventosRef = collection(this.firestore, 'eventos');
    const q = query(eventosRef, where('codigoInvitacion', '==', codigo.toUpperCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error('codigo-invalido');

    const eventoDoc = snapshot.docs[0];
    const evento = { id: eventoDoc.id, ...eventoDoc.data() } as Evento;

    // Verificar si ya es participante
    if (evento.participantes.includes(currentUser.uid)) {
      throw new Error('ya-participante');
    }

    // Agregar al usuario como participante
    await updateDoc(doc(this.firestore, `eventos/${eventoDoc.id}`), {
      participantes: arrayUnion(currentUser.uid)
    });

    return evento;
  }

  // ✅ ELIMINAR EVENTO (solo el creador)
  async eliminarEvento(eventoId: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const eventoRef = doc(this.firestore, `eventos/${eventoId}`);
    const eventoSnap = await getDoc(eventoRef);

    if (!eventoSnap.exists()) throw new Error('Evento no encontrado');

    const evento = eventoSnap.data() as Evento;
    if (evento.creadoPor.uid !== currentUser.uid) {
      throw new Error('No tienes permiso para eliminar este evento');
    }

    await deleteDoc(eventoRef);
  }
}