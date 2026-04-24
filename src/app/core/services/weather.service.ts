// 🔹 Importación de Injectable para definir un servicio en Angular
import { Injectable } from '@angular/core';

// 🔹 HttpClient permite hacer peticiones HTTP (APIs)
import { HttpClient } from '@angular/common/http';

// 🔹 Importación del environment para usar variables de entorno (como API Key)
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root' // Hace que el servicio esté disponible en toda la aplicación
})
export class WeatherService {

  // 🌐 URL base de la API de OpenWeatherMap
  private apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

  // 🔹 Inyección del HttpClient para realizar peticiones HTTP
  constructor(private http: HttpClient) {}

  // =========================
  // ✅ OBTENER CLIMA POR CIUDAD
  // =========================
  getWeather(city: string) {

    // 🔍 Realiza una petición GET a la API con los siguientes parámetros:
    // - q: nombre de la ciudad
    // - appid: API Key almacenada en environment
    // - units=metric: temperatura en grados Celsius
    // - lang=es: descripción del clima en español
    return this.http.get(
      `${this.apiUrl}?q=${city}&appid=${environment.weatherApiKey}&units=metric&lang=es`
    );
  }
}