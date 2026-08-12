import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  private apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private http: HttpClient) {}

  // 🌤️ CLIMA (OpenWeather)
  getWeatherByCoords(lat: number, lon: number) {
    return this.http.get(
      `${this.apiUrl}?lat=${lat}&lon=${lon}&appid=${environment.weatherApiKey}&units=metric&lang=es`
    );
  }

  // 📍 UBICACIÓN (Nominatim - OpenStreetMap)
getLocationName(lat: number, lon: number) {
  return this.http.get(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  );
}

    // =========================
  // ☁️ OBTENER CLIMA
  // =========================
  // getWeather(city: string) {
  //   return this.http.get(
  //     `${this.apiUrl}?q=${city}&appid=${environment.weatherApiKey}&units=metric&lang=es`
  //   );
  // }

}