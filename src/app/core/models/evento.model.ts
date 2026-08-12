export interface Lugar {
  id?: string;
  nombre: string;
  informacion: string;
  altitud: string;
  dificultad: 'Baja' | 'Baja - Media' | 'Media' | 'Media - Alta' | 'Alta' | 'Alta - Muy Alta';
  distanciaKm: number;
  tiempoEstimadoHoras: string;
  equipamiento: string[];
  DireccionPuntoInicio: string;

  latitud?: number | null;        // ✅ Acepta null
  longitud?: number | null;       // ✅ Acepta null

  requiereRegistroAcceso: boolean;
  requiereGuiaMontana: boolean;
  requierePagoEntrada: boolean;
  valorEntrada?: number | null;   // ✅ Acepta null

  requiereHorarioVisita: boolean;
  horarioVisita?: {
    apertura: string;
    cierre: string;
  } | null;                       // ✅ Acepta null

  requierePermiso: boolean;
  requiereMasInformacion: boolean;
  MasInformacion?: {
    Texto: string;
    URL: string;
    Otro: string;
  } | null;                       // ✅ Acepta null

  mapaRutaUrl?: string;
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

  ultimoMensaje?: {
    texto: string;
    autorNombre: string;
    creadoEn: any;
  };
}

// ✅ Agrega esta interfaz
import { FieldValue, Timestamp } from '@angular/fire/firestore';
export interface MensajeForo {
  id?: string;
  texto: string;
  autorUid: string;
  autorNombre: string;
  creadoEn: Date | Timestamp | FieldValue; // 👈 Actualiza aquí para admitir los tipos de Firebase
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

