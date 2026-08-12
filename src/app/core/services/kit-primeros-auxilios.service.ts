import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { KitPrimerosAuxilios } from '../models/evento.model';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class KitPrimerosAuxiliosService {

  private firestore = inject(Firestore);

  getKits(): Observable<KitPrimerosAuxilios[]> {
    const ref = collection(this.firestore, 'kit_primeros_auxilios');
    const q = query(ref, orderBy('fechaCreacion', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<KitPrimerosAuxilios[]>;
  }

  async agregarKit(data: Omit<KitPrimerosAuxilios, 'id'>) {
    const ref = collection(this.firestore, 'kit_primeros_auxilios');
    await addDoc(ref, { ...data, fechaCreacion: Timestamp.now() });
  }

  async editarKit(id: string, data: Partial<KitPrimerosAuxilios>) {
    const ref = doc(this.firestore, `kit_primeros_auxilios/${id}`);
    await updateDoc(ref, data);
  }

  async eliminarKit(id: string) {
    const ref = doc(this.firestore, `kit_primeros_auxilios/${id}`);
    await deleteDoc(ref);
  }
}