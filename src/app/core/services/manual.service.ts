import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ManualPaso } from '../models/evento.model';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ManualService {

  private firestore = inject(Firestore);

  getPasos(): Observable<ManualPaso[]> {
    const ref = collection(this.firestore, 'manual_supervivencia');
    const q = query(ref, orderBy('orden', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ManualPaso[]>;
  }

  async agregarPaso(paso: Omit<ManualPaso, 'id'>) {
    const ref = collection(this.firestore, 'manual_supervivencia');
    await addDoc(ref, {
      ...paso,
      creadoEn: Timestamp.now()
    });
  }

  async editarPaso(id: string, paso: Partial<ManualPaso>) {
    const ref = doc(this.firestore, `manual_supervivencia/${id}`);
    await updateDoc(ref, { ...paso });
  }

  async eliminarPaso(id: string) {
    const ref = doc(this.firestore, `manual_supervivencia/${id}`);
    await deleteDoc(ref);
  }
}