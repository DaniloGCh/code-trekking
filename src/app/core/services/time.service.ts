import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  dateTime = new BehaviorSubject<string>('');

  private intervalId: any;

  startClock() {
    this.update();

    this.intervalId = setInterval(() => {
      this.update();
    }, 1000);
  }

  private update() {
    const now = new Date();

    const formatted = now.toLocaleString('es-CL', {
      timeZone: 'America/Santiago', // 🇨🇱 CLAVE
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      // second: '2-digit',
      hour12: false
    });

    this.dateTime.next(formatted);
  }

  stopClock() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}