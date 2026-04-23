// src/app/core/models/evento.model.ts

export interface Lugar {
  id?: string;
  nombre: string;
  informacion: string;
  altitud: number;
  dificultad: 'Baja' | 'Media' | 'Alta';
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
  participantes: string[];
  creadoEn: any;
}