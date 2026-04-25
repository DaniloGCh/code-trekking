import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  // =========================
  // 🌐 CONFIGURACIÓN API
  // =========================
  private apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  constructor(private http: HttpClient) {}

  // =========================
  // ☁️ OBTENER CLIMA
  // =========================
  getWeather(city: string) {
    return this.http.get(
      `${this.apiUrl}?q=${city}&appid=${environment.weatherApiKey}&units=metric&lang=es`
    );
  }
}