// src/app/core/services/weather.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  private readonly weatherApiUrl =
    'https://api.openweathermap.org/data/2.5/weather';

  private readonly nominatimApiUrl =
    'https://nominatim.openstreetmap.org/reverse';


  constructor(
    private http: HttpClient
  ) {}


  // =========================================================
  // 🌤️ OPENWEATHER
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
  // 📍 NOMINATIM
  // =========================================================

  getLocationName(
    lat: number,
    lon: number
  ) {

    return this.http.get(
      `${this.nominatimApiUrl}` +
      `?lat=${lat}` +
      `&lon=${lon}` +
      `&format=json` +
      `&accept-language=es`
    );
  }

}