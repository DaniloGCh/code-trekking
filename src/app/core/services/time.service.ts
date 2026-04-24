// 🔹 Importación de Injectable para crear servicios en Angular
import { Injectable } from '@angular/core';

// 🔹 BehaviorSubject permite emitir valores y suscribirse a cambios en tiempo real
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root' // Hace que el servicio esté disponible en toda la aplicación
})
export class TimeService {

  // 📅 Observable que almacena la fecha y hora actual en formato string
  // Se inicializa con un valor vacío
  dateTime = new BehaviorSubject<string>('');

  // ⏱️ Variable para guardar el ID del intervalo (setInterval)
  private intervalId: any;

  // =========================
  // ✅ INICIAR RELOJ
  // =========================
  startClock() {

    // Ejecuta inmediatamente la actualización de la hora
    this.update();

    // Crea un intervalo que se ejecuta cada 1 segundo (1000 ms)
    this.intervalId = setInterval(() => {
      this.update(); // Actualiza la hora cada segundo
    }, 1000);
  }

  // =========================
  // 🔄 ACTUALIZAR FECHA Y HORA
  // =========================
  private update() {

    // Obtiene la fecha y hora actual del sistema
    const now = new Date();

    // Formatea la fecha en formato chileno (es-CL)
    const formatted = now.toLocaleString('es-CL', {

      timeZone: 'America/Santiago', // 🇨🇱 Zona horaria de Chile

      weekday: 'short',  // Día de la semana abreviado (ej: lun, mar)
      day: '2-digit',    // Día en formato de dos dígitos
      month: 'short',    // Mes abreviado
      hour: '2-digit',   // Hora en formato de dos dígitos
      minute: '2-digit', // Minutos en dos dígitos

      // second: '2-digit', // (Opcional) segundos, actualmente comentado

      hour12: false // Formato de 24 horas (no AM/PM)
    });

    // Emite el valor formateado a todos los suscriptores
    this.dateTime.next(formatted);
  }

  // =========================
  // ⛔ DETENER RELOJ
  // =========================
  stopClock() {

    // Si existe un intervalo activo, lo detiene
    if (this.intervalId) clearInterval(this.intervalId);
  }
}