import { FieldValue, Timestamp } from '@angular/fire/firestore'; // Importa los tipos de datos de marcas de tiempo y campos de Firebase Firestore

// =========================
// 📍 INTERFAZ LUGAR / RUTA
// =========================
export interface Lugar {
  id?: string; // Identificador único opcional generado por Firestore
  nombre: string; // Nombre del lugar, sendero o montaña
  informacion: string; // Descripción detallada sobre la ruta o ubicación
  altitud: string; // Altitud máxima alcanzada en metros sobre el nivel del mar (m s. n. m.)
  dificultad: 'Baja' | 'Baja - Media' | 'Media' | 'Media - Alta' | 'Alta' | 'Alta - Muy Alta'; // Nivel de dificultad técnica o física de la ruta
  distanciaKm: number; // Distancia total del recorrido expresada en kilómetros
  tiempoEstimadoHoras: string; // Duración estimada de la ruta en horas
  equipamiento: string[]; // Lista de artículos o indumentaria recomendada para el recorrido
  DireccionPuntoInicio: string; // Indicaciones o dirección física del punto de partida
  latitud?: number | null; // Coordenada de latitud geográfica opcional o nula
  longitud?: number | null; // Coordenada de longitud geográfica opcional o nula
  requiereRegistroAcceso: boolean; // Indica si se exige un registro previo ante las autoridades antes de ingresar
  requiereGuiaMontana: boolean; // Indica si es obligatorio realizar el recorrido con un guía certificado
  requierePagoEntrada: boolean; // Indica si la entrada al recinto o parque tiene costo
  valorEntrada?: number | null; // Precio numérico del ticket de ingreso o null si no aplica
  requiereHorarioVisita: boolean; // Confirma si el parque tiene restricción de horarios de entrada/salida
  horarioVisita?: { apertura: string; cierre: string; } | null; // Horario estructurado de apertura y cierre o null
  requierePermiso: boolean; // Indica si se requiere una autorización especial o pase oficial
  requiereMasInformacion: boolean; // Define si existen avisos adicionales importantes a consultar
  MasInformacion?: { Texto: string; URL: string; Otro: string; } | null; // Enlaces e información adicional complementaria o null
  mapaRutaUrl?: string; // URL opcional que apunta al mapa interactivo o trazado GPS
}

// =========================
// 👤 INTERFAZ PARTICIPANTE
// =========================
export interface Participante {
  uid: string; // Identificador único del usuario participante
  nombre: string; // Nombre completo o alias del usuario participante
}

// =========================
// 🏔️ INTERFAZ EVENTO
// =========================
export interface Evento {
  id?: string; // ID opcional del evento en la base de datos
  nombre: string; // Nombre de la salida o evento de trekking
  descripcion: string; // Detalles e instrucciones para la actividad organizativa
  fecha: any; // Fecha de realización del evento
  hora: string; // Hora pactada para la reunión o inicio del evento
  lugarId: string; // Identificador del lugar asociado donde se realizará el evento
  lugar: Lugar; // Objeto de tipo Lugar cargado con los datos completos de la ubicación
  creadoPor: { uid: string; nombre: string; }; // Datos estructurados del organizador que creó la actividad
  codigoInvitacion: string; // Código alfanumérico único para unirse a un evento privado
  privado: boolean; // Define si el evento es mediante código/invitación o abierto al público
  participantes: string[]; // Array con los UIDs de los participantes para consultas eficientes en BD
  participantesInfo: Participante[]; // Array de objetos con datos detallados (UID y nombre) de los asistentes
  creadoEn: any; // Marca de tiempo cuando el evento fue publicado
  ultimoMensaje?: { texto: string; autorNombre: string; creadoEn: any; }; // Previsualización opcional del último mensaje enviado al chat del evento
}

// =========================
// 💬 INTERFAZ MENSAJE FORO
// =========================
export interface MensajeForo {
  id?: string; // ID único del mensaje del chat
  texto: string; // Contenido textual escrito por el participante
  autorUid: string; // UID del usuario que envió el mensaje
  autorNombre: string; // Nombre del usuario que escribió el mensaje
  creadoEn: Date | Timestamp | FieldValue; // Marca de tiempo compatible con objetos y métodos de Firebase
}

// =========================
// 💡 INTERFAZ CONSEJO
// =========================
export interface Consejo {
  id?: string; // Identificador opcional del consejo de trekking
  titulo: string; // Título o tema corto del consejo
  descripcion: string; // Explicación amplia con la recomendación técnica
  creadoEn?: any; // Fecha opcional de creación en la plataforma
}

// =========================
// 📖 INTERFAZ MANUAL PASO
// =========================
export interface ManualPaso {
  id?: string; // ID opcional del paso instructivo
  titulo: string; // Nombre del paso de la guía
  descripcion: string; // Instrucción detallada a seguir
  icono: string; // Nombre del icono representativo para la interfaz gráfica
  orden: number; // Posición numérica para mantener la secuencia instructiva
  creadoEn?: any; // Fecha opcional de registro del paso
}

// =========================
// 🩺 KIT DE PRIMEROS AUXILIOS
// =========================
export interface KitPrimerosAuxilios {
  id?: string; // Identificador opcional del kit médico
  nombre: string; // Nombre o tipo del botiquín
  descripcion: string; // Resumen sobre la utilidad o nivel del kit
  items: string[]; // Listado de elementos médicos y curaciones incluidos
  creadoPor?: string; // UID o nombre del usuario que registró el kit
  fechaCreacion?: any; // Fecha opcional de registro del kit
}

// =========================
// 🏕️ KIT DE SUPERVIVENCIA
// =========================
export interface KitSupervivencia {
  id?: string; // Identificador opcional del kit de emergencia
  nombre: string; // Nombre o categoría del kit de supervivencia
  descripcion: string; // Explicación de las contingencias que cubre el kit
  items: string[]; // Listado de herramientas y suministros esenciales incluidos
  creadoPor?: string; // UID o nombre del creador de la lista
  fechaCreacion?: any; // Fecha opcional de creación en el sistema
}