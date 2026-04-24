// src/app/core/services/evento.service.ts

// 🔹 Importaciones de Angular para crear servicios e inyección de dependencias
import { Injectable, inject } from '@angular/core';

// 🔹 Importaciones de Firestore para trabajar con la base de datos
import { Firestore, collection, collectionData, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, arrayUnion } from '@angular/fire/firestore';

// 🔹 Observable para manejar datos en tiempo real
import { Observable } from 'rxjs';

// 🔹 Modelos de datos (interfaces)
import { Evento, Lugar, MensajeForo } from '../models/evento.model';

// 🔹 Servicio de autenticación
import { Auth } from '@angular/fire/auth';

// ✅ Agregar este import
import { arrayRemove } from '@angular/fire/firestore';

import { authState } from '@angular/fire/auth';
import { switchMap, of } from 'rxjs';

import { orderBy } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root' // Hace que el servicio esté disponible en toda la app
})
export class EventoService {

  // 🔹 Inyección de Firestore y Auth
  private firestore = inject(Firestore); // Base de datos
  private auth = inject(Auth);           // Autenticación

  // =========================
  // ✅ OBTENER TODOS LOS LUGARES
  // =========================
  getLugares(): Observable<Lugar[]> {

    // Referencia a la colección "lugares"
    const lugaresRef = collection(this.firestore, 'lugares');

    // Retorna los datos como observable en tiempo real
    return collectionData(lugaresRef, { idField: 'id' }) as Observable<Lugar[]>;
  }

  // =========================
  // ✅ GENERAR CÓDIGO DE INVITACIÓN
  // =========================
  private generarCodigo(): string {

    // Caracteres posibles para el código
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    // Prefijo del código
    let codigo = 'TRK-';

    // Genera 6 caracteres aleatorios
    for (let i = 0; i < 6; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Retorna el código generado
    return codigo;
  }

  // =========================
  // ✅ CREAR EVENTO
  // =========================
  async crearEvento(evento: Omit<Evento, 'id' | 'codigoInvitacion' | 'participantes' | 'creadoEn'>): Promise<string> {

    // Obtener usuario actual autenticado
    const currentUser = this.auth.currentUser;

    // Validar que exista un usuario logueado
    if (!currentUser) throw new Error('No hay usuario autenticado');

    // Referencia a la colección "eventos"
    const eventosRef = collection(this.firestore, 'eventos');

    // Construcción del nuevo evento
    const nuevoEvento: Omit<Evento, 'id'> = {

      // Copia los datos recibidos
      ...evento,

      // Genera código de invitación único
      codigoInvitacion: this.generarCodigo(),

      // Agrega al creador como primer participante
      participantes: [currentUser.uid],

      // Fecha de creación
      creadoEn: new Date(),
    };

    // Guarda el evento en Firestore
    const docRef = await addDoc(eventosRef, nuevoEvento);

    // Retorna el ID del documento creado
    return docRef.id;
  }

  // =========================
  // ✅ OBTENER EVENTOS DEL USUARIO
  // =========================
getMisEventos(): Observable<Evento[]> {
  return authState(this.auth).pipe(
    switchMap(user => {
      if (!user) return of([]);
      const eventosRef = collection(this.firestore, 'eventos');
      const q = query(eventosRef, where('participantes', 'array-contains', user.uid));
      return collectionData(q, { idField: 'id' }) as Observable<Evento[]>;
    })
  );
}

  // =========================
  // ✅ OBTENER EVENTO POR ID
  // =========================
  async getEventoById(id: string): Promise<Evento | null> {

    // Referencia al evento por ID
    const eventoRef = doc(this.firestore, `eventos/${id}`);

    // Obtener el documento
    const eventoSnap = await getDoc(eventoRef);

    // Si existe, retorna el evento con su ID
    if (eventoSnap.exists()) {
      return { id: eventoSnap.id, ...eventoSnap.data() } as Evento;
    }

    // Si no existe, retorna null
    return null;
  }

  // =========================
  // ✅ UNIRSE A EVENTO POR CÓDIGO
  // =========================
  async unirseConCodigo(codigo: string): Promise<Evento | null> {

    // Obtener usuario actual
    const currentUser = this.auth.currentUser;

    // Validar autenticación
    if (!currentUser) throw new Error('No hay usuario autenticado');

    // Referencia a la colección de eventos
    const eventosRef = collection(this.firestore, 'eventos');

    // Buscar evento por código (normalizado a mayúsculas y sin espacios)
    const q = query(eventosRef, where('codigoInvitacion', '==', codigo.toUpperCase().trim()));

    // Ejecutar consulta
    const snapshot = await getDocs(q);

    // Validar si existe el evento
    if (snapshot.empty) throw new Error('codigo-invalido');

    // Obtener el primer resultado
    const eventoDoc = snapshot.docs[0];

    // Construir objeto evento
    const evento = { id: eventoDoc.id, ...eventoDoc.data() } as Evento;

    // Verificar si el usuario ya es participante
    if (evento.participantes.includes(currentUser.uid)) {
      throw new Error('ya-participante');
    }

    // Agregar usuario al array de participantes
    await updateDoc(doc(this.firestore, `eventos/${eventoDoc.id}`), {
      participantes: arrayUnion(currentUser.uid) // arrayUnion evita duplicados
    });

    // Retornar el evento
    return evento;
  }

  // =========================
  // ✅ ELIMINAR EVENTO
  // =========================
  async eliminarEvento(eventoId: string): Promise<void> {

    // Obtener usuario actual
    const currentUser = this.auth.currentUser;

    // Validar autenticación
    if (!currentUser) throw new Error('No hay usuario autenticado');

    // Referencia al evento
    const eventoRef = doc(this.firestore, `eventos/${eventoId}`);

    // Obtener datos del evento
    const eventoSnap = await getDoc(eventoRef);

    // Validar existencia
    if (!eventoSnap.exists()) throw new Error('Evento no encontrado');

    // Obtener datos del evento
    const evento = eventoSnap.data() as Evento;

    // Validar que el usuario sea el creador
    if (evento.creadoPor.uid !== currentUser.uid) {
      throw new Error('No tienes permiso para eliminar este evento');
    }

    // Eliminar el documento del evento
    await deleteDoc(eventoRef);
  }
// ✅ Agregar este método
async salirEvento(eventoId: string, uid: string): Promise<void> {
  const eventoRef = doc(this.firestore, `eventos/${eventoId}`);
  await updateDoc(eventoRef, {
    participantes: arrayRemove(uid)
  });
}

// ✅ OBTENER MENSAJES DEL FORO
async getMensajesForo(eventoId: string): Promise<MensajeForo[]> {
  const foroRef = collection(this.firestore, `eventos/${eventoId}/foro`);
  const q = query(foroRef, orderBy('creadoEn', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MensajeForo[];
}

// ✅ ENVIAR MENSAJE AL FORO
async enviarMensaje(eventoId: string, mensaje: Omit<MensajeForo, 'id'>): Promise<void> {
  const foroRef = collection(this.firestore, `eventos/${eventoId}/foro`);
  await addDoc(foroRef, mensaje);
}

// ✅ ELIMINAR MENSAJE DEL FORO (solo organizador)
async eliminarMensaje(eventoId: string, mensajeId: string): Promise<void> {
  const mensajeRef = doc(this.firestore, `eventos/${eventoId}/foro/${mensajeId}`);
  await deleteDoc(mensajeRef);
}
  
}