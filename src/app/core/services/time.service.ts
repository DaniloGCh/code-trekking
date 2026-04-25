import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  // =========================
  // 📡 ESTADO REACTIVO
  // =========================
  dateTime = new BehaviorSubject<string>('');
  private intervalId: any;

  // =========================
  // ▶️ INICIAR RELOJ
  // =========================
  startClock(): void {
    this.update();

    this.intervalId = setInterval(() => {
      this.update();
    }, 1000);
  }

  // =========================
  // 🔄 ACTUALIZAR FECHA Y HORA
  // =========================
  private update(): void {
    const now = new Date();

    const formatted = now.toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    this.dateTime.next(formatted);
  }

  // =========================
  // ⛔ DETENER RELOJ
  // =========================
  stopClock(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}