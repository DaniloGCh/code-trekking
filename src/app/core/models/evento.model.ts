// src/app/core/models/evento.model.ts

export interface Lugar {
  id?: string;
  nombre: string;
  informacion: string;
  altitud: string;
  dificultad: 'Baja' | 'Baja - Media' | 'Media' | 'Media - Alta' | 'Alta' | 'Alta - Muy Alta';
  distanciaKm: number;               // ✅ Nuevo
  tiempoEstimadoHoras: string;       // ✅ Nuevo
  equipamiento: string[];            // ✅ Nuevo
  DireccionPuntoInicio: string;               // ✅ Nuevo
  requiereRegistroAcceso: boolean;          // ✅ Nuevo
  requierePagoEntrada: boolean;          // ✅ Nuevo
  valorEntrada?: number; // 👈 AGREGAR ESTO
  requiereHorarioVisita: boolean;

  horarioVisita?: {
    apertura: string;
    cierre: string;
  };
  requierePermiso: boolean;          // ✅ Nuevo
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

export interface ManualPaso {
  id?: string;
  titulo: string;
  descripcion: string;
  icono: string;
  orden: number;
  creadoEn?: any;
}

// 🩺 KIT DE PRIMEROS AUXILIOS
export interface KitPrimerosAuxilios {
  id?: string;
  nombre: string;
  descripcion: string;
  items: string[];
  creadoPor?: string;
  fechaCreacion?: any;
}

// 🏕️ KIT DE SUPERVIVENCIA
export interface KitSupervivencia {
  id?: string;
  nombre: string;
  descripcion: string;
  items: string[];
  creadoPor?: string;
  fechaCreacion?: any;
}
