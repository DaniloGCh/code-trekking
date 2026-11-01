// src/app/core/utils/firestore-utils.ts
import {
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocFromCache,
  getDocFromServer
} from '@angular/fire/firestore';

/**
 * Lee un documento priorizando el servidor (dato más reciente) y, si no hay
 * internet o el servidor no responde, usa la copia guardada en el
 * dispositivo. Sin conexión ni siquiera intenta el servidor, porque esa
 * espera puede tardar varios segundos antes de fallar.
 */
export async function leerDocPreferirServidor<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  if (navigator.onLine) {
    try {
      return await getDocFromServer(ref);
    } catch {
      // Se intenta con la caché
    }
  }

  try {
    return await getDocFromCache(ref);
  } catch {
    // No estaba en caché: último intento normal (falla si no hay red)
    return getDoc(ref);
  }
}
