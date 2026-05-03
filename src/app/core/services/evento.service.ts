// =========================
// 🔹 ANGULAR
// =========================
import { Injectable, inject } from '@angular/core';

// =========================
// 🔹 FIREBASE FIRESTORE
// =========================
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove
} from '@angular/fire/firestore';


// =========================
// 🔹 FIREBASE AUTH
// =========================
import { Auth, authState } from '@angular/fire/auth';

// =========================
// 🔹 RXJS
// =========================
import { Observable, of , BehaviorSubject} from 'rxjs';
import { switchMap } from 'rxjs/operators';

// =========================
// 🔹 MODELOS
// =========================
import { Evento, Lugar, MensajeForo } from '../models/evento.model';

@Injectable({
  providedIn: 'root'
})
export class EventoService {

  // =========================
  // 🔹 DEPENDENCIAS
  // =========================
  private firestore = inject(Firestore);
  private auth = inject(Auth);

    // 🔴 NOTIFICADOR GLOBAL (NUEVO)
  private foroVistoSubject = new BehaviorSubject<void>(undefined);
  foroVisto$ = this.foroVistoSubject.asObservable();

  // =========================
  // 📍 OBTENER LUGARES
  // =========================
  getLugares(): Observable<Lugar[]> {
    const ref = collection(this.firestore, 'lugares');
    return collectionData(ref, { idField: 'id' }) as Observable<Lugar[]>;
  }

  // =========================
  // 🔢 GENERAR CÓDIGO INVITACIÓN
  // =========================
  private generarCodigo(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = 'TRK-';

    for (let i = 0; i < 6; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return codigo;
  }

  // =========================
  // ➕ CREAR EVENTO
  // =========================
  async crearEvento(
    evento: Omit<Evento, 'id' | 'codigoInvitacion' | 'participantes' | 'participantesInfo' | 'creadoEn'>
  ): Promise<string> {

    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const userSnap = await getDoc(doc(this.firestore, `usuarios/${currentUser.uid}`));
    const nombre = (userSnap.data() as any)?.nombre || 'Usuario';

    const ref = collection(this.firestore, 'eventos');

    const nuevoEvento: Omit<Evento, 'id'> = {
      ...evento,
      codigoInvitacion: this.generarCodigo(),
      participantes: [currentUser.uid],
      participantesInfo: [{ uid: currentUser.uid, nombre }],
      creadoEn: new Date(),
    };

    const docRef = await addDoc(ref, nuevoEvento);
    return docRef.id;
  }

  // =========================
  // 📌 MIS EVENTOS
  // =========================
  getMisEventos(): Observable<Evento[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return of([]);

        const ref = collection(this.firestore, 'eventos');
        const q = query(ref, where('participantes', 'array-contains', user.uid));

        return collectionData(q, { idField: 'id' }) as Observable<Evento[]>;
      })
    );
  }

  // =========================
  // 🔍 EVENTO POR ID
  // =========================
  async getEventoById(id: string): Promise<Evento | null> {
    const ref = doc(this.firestore, `eventos/${id}`);
    const snap = await getDoc(ref);

    return snap.exists()
      ? ({ id: snap.id, ...snap.data() } as Evento)
      : null;
  }

  // =========================
  // 🔗 UNIRSE CON CÓDIGO
  // =========================
// =========================
// 🔗 UNIRSE CON CÓDIGO
// =========================
async unirseConCodigo(codigo: string): Promise<Evento | null> {

  const currentUser = this.auth.currentUser;
  if (!currentUser) throw new Error('No hay usuario autenticado');

  const ref = collection(this.firestore, 'eventos');
  const q = query(ref, where('codigoInvitacion', '==', codigo.toUpperCase().trim()));

  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('codigo-invalido');

  const docEvent = snapshot.docs[0];
  const evento = { id: docEvent.id, ...docEvent.data() } as Evento;

  // 🚫 VALIDAR SI YA FINALIZÓ
  const fechaEvento = evento.fecha.toDate
    ? evento.fecha.toDate()
    : new Date(evento.fecha);

  const ahora = new Date();

  if (fechaEvento < ahora) {
    throw new Error('evento-finalizado'); // 🔥 nuevo error
  }

  // 🚫 VALIDAR SI YA ES PARTICIPANTE
  if (evento.participantes.includes(currentUser.uid)) {
    throw new Error('ya-participante');
  }

  const userSnap = await getDoc(doc(this.firestore, `usuarios/${currentUser.uid}`));
  const nombre = (userSnap.data() as any)?.nombre || 'Usuario';

  // ✅ RECIÉN AQUÍ SE UNE
  await updateDoc(doc(this.firestore, `eventos/${docEvent.id}`), {
    participantes: arrayUnion(currentUser.uid),
    participantesInfo: arrayUnion({ uid: currentUser.uid, nombre })
  });

  return evento;
}

  // =========================
  // 🗑️ ELIMINAR EVENTO
  // =========================
  async eliminarEvento(eventoId: string): Promise<void> {

    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const ref = doc(this.firestore, `eventos/${eventoId}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error('Evento no encontrado');

    const evento = snap.data() as Evento;

    if (evento.creadoPor.uid !== currentUser.uid) {
      throw new Error('No tienes permiso para eliminar este evento');
    }

    await deleteDoc(ref);
  }

  // =========================
  // 🚪 SALIR EVENTO
  // =========================
  async salirEvento(eventoId: string, uid: string): Promise<void> {
    const ref = doc(this.firestore, `eventos/${eventoId}`);
    await updateDoc(ref, {
      participantes: arrayRemove(uid)
    });
  }

  // =========================
  // 💬 FORO - MENSAJES
  // =========================
  async getMensajesForo(eventoId: string): Promise<MensajeForo[]> {
    const ref = collection(this.firestore, `eventos/${eventoId}/foro`);
    const q = query(ref, orderBy('creadoEn', 'asc'));

    const snap = await getDocs(q);

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as MensajeForo[];
  }

 async enviarMensaje(eventoId: string, mensaje: Omit<MensajeForo, 'id'>): Promise<void> {
  const ref = collection(this.firestore, `eventos/${eventoId}/foro`);

  // 📩 Guardar mensaje en el foro
  await addDoc(ref, mensaje);

  // 🔥 ACTUALIZAR ÚLTIMO MENSAJE EN EL EVENTO (ESTILO WHATSAPP)
  const eventoRef = doc(this.firestore, `eventos/${eventoId}`);

  await updateDoc(eventoRef, {
    ultimoMensaje: {
      texto: mensaje.texto,
      autorNombre: mensaje.autorNombre,
      creadoEn: new Date()
    }
  });
}

  async eliminarMensaje(eventoId: string, mensajeId: string): Promise<void> {
    const ref = doc(this.firestore, `eventos/${eventoId}/foro/${mensajeId}`);
    await deleteDoc(ref);
  }

  // =========================
  // 🔔 MENSAJES NUEVOS
  // =========================
  async contarMensajesNuevos(eventoId: string, uid: string): Promise<number> {

    const key = `foro_ultima_visita_${eventoId}_${uid}`;
    const ultimaVisita = localStorage.getItem(key);

    const ref = collection(this.firestore, `eventos/${eventoId}/foro`);
    const snap = await getDocs(query(ref));

    const mensajes = snap.docs.map(d => d.data());

    return mensajes.filter(m => {
      const esMio = m['autorUid'] === uid;
      const esNuevo = ultimaVisita
        ? m['creadoEn'].toDate() > new Date(ultimaVisita)
        : true;

      return !esMio && esNuevo;
    }).length;
  }

  // =========================
  // 👁️ MARCAR FORO VISTO
  // =========================
  marcarForoVisto(eventoId: string, uid: string): void {
    const key = `foro_ultima_visita_${eventoId}_${uid}`;
    localStorage.setItem(key, new Date().toISOString());
        // 🔥 AVISA A TODA LA APP
    this.foroVistoSubject.next();
  }


  getMensajesForoRealtime(eventoId: string): Observable<MensajeForo[]> {
  const ref = collection(this.firestore, `eventos/${eventoId}/foro`);
  const q = query(ref, orderBy('creadoEn', 'asc'));

  return collectionData(q, { idField: 'id' }) as Observable<MensajeForo[]>;
}


  
}