import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface FotoGaleria {
  id?: string;
  uid: string;
  nombreUsuario: string;
  imageUrl: string;
  fechaSubida: string;
}

@Injectable({
  providedIn: 'root'
})
export class GaleriaFotosService {

  private firestore = inject(Firestore);
  private readonly COLECCION = 'galeriaFotos';

  obtenerFotosUsuario(uid: string): Observable<FotoGaleria[]> {
    const ref = collection(this.firestore, this.COLECCION);
    const q = query(ref, where('uid', '==', uid), orderBy('fechaSubida', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<FotoGaleria[]>;
  }

  async subirFoto(foto: FotoGaleria): Promise<void> {
    const ref = collection(this.firestore, this.COLECCION);
    await addDoc(ref, foto);
  }

  async eliminarFoto(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.COLECCION}/${id}`);
    await deleteDoc(ref);
  }
}