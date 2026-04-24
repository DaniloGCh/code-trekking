// 🔹 Importación de Injectable para definir un servicio en Angular
import { Injectable } from '@angular/core';

// 🔹 BehaviorSubject permite manejar datos reactivos (en tiempo real)
import { BehaviorSubject } from 'rxjs';

// 🔹 Servicio que se encarga de consumir la API del clima
import { WeatherService } from './weather.service';

@Injectable({
  providedIn: 'root' // Hace que el servicio esté disponible en toda la app
})
export class WeatherGlobalService {

  // 🌍 Ciudad por defecto para consultar el clima
  city = 'Santiago';

  // 🌡️ Temperatura actual (puede ser null si hay error)
  temperature = new BehaviorSubject<number | null>(null);

  // 📝 Descripción del clima (ej: "nublado", "lluvia ligera")
  description = new BehaviorSubject<string>('');

  // 🌤️ Icono representativo del clima (para UI)
  icon = new BehaviorSubject<string>('partly-sunny');

  // 🔹 Inyección del servicio que obtiene los datos desde la API
  constructor(private weatherService: WeatherService) {}

  // =========================
  // ✅ CARGAR CLIMA
  // =========================
  loadWeather() {

    // Llama al servicio que obtiene el clima según la ciudad
    this.weatherService.getWeather(this.city).subscribe({

      // ✔️ Cuando la respuesta es exitosa
      next: (data: any) => {

        // 🌡️ Obtener temperatura y redondearla
        const temp = Math.round(data.main.temp);

        // 🌥️ Obtener estado principal del clima (Clouds, Rain, etc.)
        const main = data.weather[0].main;

        // Actualizar temperatura en el observable
        this.temperature.next(temp);

        // Actualizar descripción del clima
        this.description.next(data.weather[0].description);

        // 🔄 Asignar icono según el tipo de clima
        if (main === 'Clouds') this.icon.next('cloudy');          // Nublado
        else if (main === 'Rain') this.icon.next('rainy');        // Lluvia
        else if (main === 'Clear') this.icon.next('sunny');       // Soleado
        else if (main === 'Thunderstorm') this.icon.next('thunderstorm'); // Tormenta
        else this.icon.next('partly-sunny'); // Clima mixto por defecto
      },

      // ❌ Manejo de error en la API
      error: (err) => {

        // Mostrar error en consola
        console.error('Error clima:', err);

        // Resetear valores en caso de error
        this.temperature.next(null);
        this.description.next('Sin datos');
        this.icon.next('help-circle'); // Icono de error
      }
    });
  }
}