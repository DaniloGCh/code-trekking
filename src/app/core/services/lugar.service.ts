// src/app/core/services/lugar.service.ts

import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Lugar } from '../models/evento.model';

@Injectable({
  providedIn: 'root'
})
export class LugarService {

  private firestore = inject(Firestore);

  // ✅ LISTAR LUGARES
  getLugares(): Observable<Lugar[]> {
    const lugaresRef = collection(this.firestore, 'lugares');
    return collectionData(lugaresRef, { idField: 'id' }) as Observable<Lugar[]>;
  }

  // ✅ AGREGAR LUGAR
  async agregarLugar(lugar: Omit<Lugar, 'id'>): Promise<void> {
    const lugaresRef = collection(this.firestore, 'lugares');
    await addDoc(lugaresRef, lugar);
  }

  // ✅ EDITAR LUGAR
  async editarLugar(id: string, lugar: Omit<Lugar, 'id'>): Promise<void> {
    const lugarRef = doc(this.firestore, `lugares/${id}`);
    await updateDoc(lugarRef, { ...lugar });
  }

  // ✅ ELIMINAR LUGAR
  async eliminarLugar(id: string): Promise<void> {
    const lugarRef = doc(this.firestore, `lugares/${id}`);
    await deleteDoc(lugarRef);
  }
}