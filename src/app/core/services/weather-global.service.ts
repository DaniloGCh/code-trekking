import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { WeatherService } from './weather.service';
import { SosService } from './sos.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherGlobalService {

  temperature = new BehaviorSubject<number | null>(null);
  description = new BehaviorSubject<string>('');
  icon = new BehaviorSubject<string>('partly-sunny');
  locationName = new BehaviorSubject<string>('Ubicación desconocida');

  humidity = new BehaviorSubject<number | null>(null);
  windSpeed = new BehaviorSubject<number | null>(null);

  // 🧠 CACHE DE UBICACIÓN (Nominatim)
  private lastLocationName: string | null = null;

  constructor(
    private weatherService: WeatherService,
    private sosService: SosService
  ) {}

  async loadWeather(): Promise<void> {

    try {
      const ubicacion = await this.sosService.obtenerUbicacion();

      console.log('📍 LAT:', ubicacion.latitud);
      console.log('📍 LON:', ubicacion.longitud);

      // =========================
      // 🌤️ CLIMA
      // =========================
      const weatherData: any = await firstValueFrom(
        this.weatherService.getWeatherByCoords(
          ubicacion.latitud,
          ubicacion.longitud
        )
      );

      const temp = Math.round(weatherData.main.temp);
      const main = weatherData.weather[0].main;
      const desc = weatherData.weather[0].description.toLowerCase();

      this.temperature.next(temp);
      this.description.next(weatherData.weather[0].description);

      // 🎨 ICONO INTELIGENTE
      if (
        desc.includes('lluvia') ||
        desc.includes('rain') ||
        desc.includes('drizzle') ||
        desc.includes('shower')
      ) {
        this.icon.next('rainy');
      }
      else if (desc.includes('tormenta') || main === 'Thunderstorm') {
        this.icon.next('thunderstorm');
      }
      else if (desc.includes('nube') || main === 'Clouds') {
        this.icon.next('cloudy');
      }
      else if (main === 'Clear') {
        this.icon.next('sunny');
      }
      else {
        this.icon.next('partly-sunny');
      }

      // 💧 Humedad
      this.humidity.next(weatherData.main.humidity);

      // 🌬️ Viento (m/s → km/h)
      const windSpeed = Math.round(weatherData.wind.speed * 3.6);
      this.windSpeed.next(windSpeed);

      // =========================
      // 📍 UBICACIÓN (CON CACHE)
      // =========================
      if (this.lastLocationName) {

        // ✅ Usa cache (no llama a Nominatim)
        this.locationName.next(this.lastLocationName);

      } else {

        // 🔄 Primera vez → consulta API
        const locationData: any = await firstValueFrom(
          this.weatherService.getLocationName(
            ubicacion.latitud,
            ubicacion.longitud
          )
        );

        console.log('📍 NOMINATIM:', locationData);

        const address = locationData.address;

        let lugar =
          address?.suburb ||
          address?.city ||
          address?.town ||
          address?.village ||
          address?.county ||
          address?.state ||
          'Ubicación actual';

        // 💾 Guardar en cache
        this.lastLocationName = lugar;

        this.locationName.next(lugar);
      }

    } catch (error) {
      console.error('Error cargando clima:', error);
      this.setErrorState();
    }
  }

  private setErrorState() {
    this.temperature.next(null);
    this.description.next('Sin datos');
    this.icon.next('help-circle');
    this.humidity.next(null);
    this.windSpeed.next(null);
    this.locationName.next('Ubicación desconocida');
  }
}