import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WeatherService } from './weather.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherGlobalService {

  // =========================
  // 🌍 CONFIGURACIÓN BASE
  // =========================
  city = 'Santiago';

  // =========================
  // 📡 ESTADO REACTIVO (OBSERVABLES)
  // =========================
  temperature = new BehaviorSubject<number | null>(null);
  description = new BehaviorSubject<string>('');
  icon = new BehaviorSubject<string>('partly-sunny');

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  constructor(private weatherService: WeatherService) {}

  // =========================
  // ☁️ CARGAR CLIMA
  // =========================
  loadWeather(): void {

    this.weatherService.getWeather(this.city).subscribe({

      next: (data: any) => {

        const temp = Math.round(data.main.temp);
        const main = data.weather[0].main;

        this.temperature.next(temp);
        this.description.next(data.weather[0].description);

        if (main === 'Clouds') this.icon.next('cloudy');
        else if (main === 'Rain') this.icon.next('rainy');
        else if (main === 'Clear') this.icon.next('sunny');
        else if (main === 'Thunderstorm') this.icon.next('thunderstorm');
        else this.icon.next('partly-sunny');
      },

      error: (err) => {
        console.error('Error clima:', err);

        this.temperature.next(null);
        this.description.next('Sin datos');
        this.icon.next('help-circle');
      }
    });
  }
}