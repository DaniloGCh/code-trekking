import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { KitSupervivencia } from '../models/evento.model';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class KitSupervivenciaService {

  private firestore = inject(Firestore);

  getKits(): Observable<KitSupervivencia[]> {
    const ref = collection(this.firestore, 'kit_supervivencia');
    const q = query(ref, orderBy('fechaCreacion', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<KitSupervivencia[]>;
  }

  async agregarKit(data: Omit<KitSupervivencia, 'id'>) {
    const ref = collection(this.firestore, 'kit_supervivencia');
    await addDoc(ref, { ...data, fechaCreacion: Timestamp.now() });
  }

  async editarKit(id: string, data: Partial<KitSupervivencia>) {
    const ref = doc(this.firestore, `kit_supervivencia/${id}`);
    await updateDoc(ref, data);
  }

  async eliminarKit(id: string) {
    const ref = doc(this.firestore, `kit_supervivencia/${id}`);
    await deleteDoc(ref);
  }
}