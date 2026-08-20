// src/app/core/services/weather.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  // =========================================================
  // 🌤️ OPENWEATHER
  // =========================================================

  private readonly weatherApiUrl =
    'https://api.openweathermap.org/data/2.5/weather';


  constructor(
    private http: HttpClient
  ) {}


  // =========================================================
  // 🌤️ OBTENER CLIMA POR COORDENADAS
  // =========================================================

  getWeatherByCoords(
    lat: number,
    lon: number
  ) {

    return this.http.get(
      `${this.weatherApiUrl}` +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&appid=${environment.weatherApiKey}` +
      `&units=metric` +
      `&lang=es`
    );
  }


  // =========================================================
  // 📍 OBTENER NOMBRE DE UBICACIÓN
  // =========================================================

  getLocationName(
    lat: number,
    lon: number
  ) {

    return this.http.get(
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&format=json` +
      `&accept-language=es`
    );
  }

}