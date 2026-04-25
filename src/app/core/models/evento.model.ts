// src/app/core/models/evento.model.ts

export interface Lugar {
  id?: string;
  nombre: string;
  informacion: string;
  altitud: number;
  dificultad: 'Baja' | 'Media' | 'Alta';
  distanciaKm: number;               // ✅ Nuevo
  tiempoEstimadoHoras: number;       // ✅ Nuevo
  temporada: string;                 // ✅ Nuevo
  equipamiento: string[];            // ✅ Nuevo
  puntoInicio: string;               // ✅ Nuevo
  requierePermiso: boolean;          // ✅ Nuevo
  calificacionRiesgo: 'Bajo' | 'Moderado' | 'Alto' | 'Extremo'; // ✅ Nuevo
}

export interface Participante {
  uid: string;
  nombre: string;
}

export interface Evento {
  id?: string;
  nombre: string;
  descripcion: string;
  fecha: any;
  hora: string;
  lugarId: string;
  lugar: Lugar;
  creadoPor: {
    uid: string;
    nombre: string;
  };
  codigoInvitacion: string;
  privado: boolean;
  participantes: string[];           // ✅ Se mantiene para queries
  participantesInfo: Participante[]; // ✅ Nuevo: array con uid y nombre
  creadoEn: any;
}

// ✅ Agrega esta interfaz
export interface MensajeForo {
  id?: string;
  texto: string;
  autorUid: string;
  autorNombre: string;
  creadoEn: any;
}

// ✅ Agrega esta interfaz
export interface Consejo {
  id?: string;
  titulo: string;
  descripcion: string;
  creadoEn?: any;
}