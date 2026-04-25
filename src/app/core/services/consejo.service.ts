// src/app/core/services/consejo.service.ts

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, orderBy, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Consejo } from '../models/evento.model';

@Injectable({
  providedIn: 'root'
})
export class ConsejoService {

  private firestore = inject(Firestore);

  // ✅ LISTAR CONSEJOS
  getConsejos(): Observable<Consejo[]> {
    const ref = collection(this.firestore, 'consejos');
    const q = query(ref, orderBy('creadoEn', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Consejo[]>;
  }

  // ✅ AGREGAR CONSEJO
  async agregarConsejo(consejo: Omit<Consejo, 'id'>): Promise<void> {
    const ref = collection(this.firestore, 'consejos');
    await addDoc(ref, { ...consejo, creadoEn: new Date() });
  }

  // ✅ EDITAR CONSEJO
  async editarConsejo(id: string, consejo: Omit<Consejo, 'id' | 'creadoEn'>): Promise<void> {
    const ref = doc(this.firestore, `consejos/${id}`);
    await updateDoc(ref, { ...consejo });
  }

  // ✅ ELIMINAR CONSEJO
  async eliminarConsejo(id: string): Promise<void> {
    const ref = doc(this.firestore, `consejos/${id}`);
    await deleteDoc(ref);
  }
}