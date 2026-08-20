// src/app/core/services/weather-global.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { WeatherService } from './weather.service';
import { SosService, UbicacionSOS } from './sos.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherGlobalService {

  // =========================================================
  // 🌡️ DATOS DEL CLIMA
  // =========================================================

  temperature = new BehaviorSubject<number | null>(null);
  description = new BehaviorSubject<string>('');
  icon = new BehaviorSubject<string>('partly-sunny');
  humidity = new BehaviorSubject<number | null>(null);
  windSpeed = new BehaviorSubject<number | null>(null);
  locationName = new BehaviorSubject<string>('Ubicación desconocida');

  // =========================================================
  // 📍 CONTROL GPS
  // =========================================================

  private watchId: string | null = null;
  private lastCoords: { lat: number; lon: number } | null = null;

  // =========================================================
  // 🧠 CACHE UBICACIÓN
  // =========================================================

  private lastLocationName: string | null = null;

  // Evita varias cargas simultáneas
  private loadingWeather = false;

  private apiKey = 'f8e0d33985f63435dd27a164a34eabba';

  constructor(
    private weatherService: WeatherService,
    private sosService: SosService
  ) {}

  // =========================================================
  // 🧭 TRADUCIR ERROR DE UBICACIÓN A MENSAJE PARA EL USUARIO
  // =========================================================

  private mensajeErrorUbicacion(error: any): string {

    if (error?.message === 'permiso-denegado') {
      return 'Permiso de ubicación denegado';
    }

    if (error?.message === 'tiempo-excedido') {
      return 'GPS lento, intenta de nuevo';
    }

    return 'GPS no disponible';
  }

  // =========================================================
  // 🌤️ CARGAR CLIMA
  // =========================================================

  async loadWeather(ubicacion?: UbicacionSOS): Promise<void> {

    if (this.loadingWeather) {
      console.log('⏳ Ya se está cargando el clima');
      return;
    }

    this.loadingWeather = true;

    // =======================================================
    // 📍 PASO 1: OBTENER UBICACIÓN
    // =======================================================

    if (!ubicacion) {

      try {

        console.log('📍 Solicitando ubicación...');
        ubicacion = await this.sosService.obtenerUbicacion();

      } catch (error: any) {

        console.error('❌ Error obteniendo GPS en loadWeather():', error);

        this.locationName.next(this.mensajeErrorUbicacion(error));

        this.loadingWeather = false;
        return;
      }
    }

    console.log('📍 Coordenadas:', ubicacion.latitud, ubicacion.longitud);

    // =======================================================
    // 🌤️ PASO 2: PEDIR EL CLIMA A OPENWEATHER (CON FETCH NATIVO)
    // =======================================================

    let weatherData: any;

    try {

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${ubicacion.latitud}&lon=${ubicacion.longitud}&appid=${this.apiKey}&units=metric&lang=es`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP Status: ${response.status}`);
      }

      weatherData = await response.json();

    } catch (error: any) {

      console.error('❌ Error consultando OpenWeatherMap via fetch:', error);

      this.locationName.next(
        'No se pudo obtener el clima (API o conexión)'
      );

      this.loadingWeather = false;
      return;
    }

    // =======================================================
    // 🌡️ TEMPERATURA
    // =======================================================

    const temp = Math.round(weatherData.main.temp);
    this.temperature.next(temp);

    // =======================================================
    // 🌧️ DESCRIPCIÓN
    // =======================================================

    const main = weatherData.weather[0].main;
    const desc = weatherData.weather[0].description.toLowerCase();
    this.description.next(weatherData.weather[0].description);

    // =======================================================
    // 🎨 ICONO
    // =======================================================

    if (
      desc.includes('lluvia') ||
      desc.includes('rain') ||
      desc.includes('drizzle') ||
      desc.includes('shower')
    ) {
      this.icon.next('rainy');

    } else if (desc.includes('tormenta') || main === 'Thunderstorm') {
      this.icon.next('thunderstorm');

    } else if (desc.includes('nube') || main === 'Clouds') {
      this.icon.next('cloudy');

    } else if (main === 'Clear') {
      this.icon.next('sunny');

    } else {
      this.icon.next('partly-sunny');
    }

    // =======================================================
    // 💧 HUMEDAD
    // =======================================================

    this.humidity.next(weatherData.main.humidity);

    // =======================================================
    // 🌬️ VIENTO
    // =======================================================

    const windSpeed = Math.round(weatherData.wind.speed * 3.6);
    this.windSpeed.next(windSpeed);

    // =======================================================
    // 📍 PASO 3: NOMBRE DE UBICACIÓN (FETCH NATIVO O NOMINATIM)
    // =======================================================

    if (!this.lastLocationName) {

      try {

        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${ubicacion.latitud}&lon=${ubicacion.longitud}`;
        const geoResponse = await fetch(geoUrl);

        if (geoResponse.ok) {
          const locationData = await geoResponse.json();
          const address = locationData?.address;

          this.lastLocationName =
            address?.suburb ||
            address?.city ||
            address?.town ||
            address?.village ||
            address?.county ||
            address?.state ||
            'Ubicación actual';
        } else {
          this.lastLocationName = weatherData.name || 'Ubicación actual';
        }

      } catch (error) {

        console.warn('⚠️ No se pudo obtener nombre de ubicación:', error);
        this.lastLocationName = weatherData.name || 'Ubicación actual';
      }
    }

    this.locationName.next(this.lastLocationName || 'Ubicación actual');

    console.log('✅ Clima cargado correctamente');

    this.loadingWeather = false;
  }

  // =========================================================
  // 📡 INICIAR SEGUIMIENTO
  // =========================================================

  async startLocationTracking(): Promise<void> {

    if (this.watchId !== null) {
      console.log('⚠️ El seguimiento GPS ya está activo');
      return;
    }

    console.log('📡 Iniciando seguimiento GPS...');

    let ubicacion: UbicacionSOS;

    try {

      ubicacion = await this.sosService.obtenerUbicacion();

      this.lastCoords = {
        lat: ubicacion.latitud,
        lon: ubicacion.longitud
      };

      await this.loadWeather(ubicacion);

    } catch (error: any) {

      console.error('❌ No se pudo obtener ubicación inicial:', error);

      this.locationName.next(this.mensajeErrorUbicacion(error));

      return;
    }

    this.watchId = await this.sosService.watchUbicacion(
      async (ubicacionNueva: UbicacionSOS) => {

        console.log(
          '📍 Nueva posición:',
          ubicacionNueva.latitud,
          ubicacionNueva.longitud
        );

        if (!this.lastCoords) {
          this.lastCoords = {
            lat: ubicacionNueva.latitud,
            lon: ubicacionNueva.longitud
          };
          return;
        }

        const distancia = this.calcularDistancia(
          this.lastCoords.lat,
          this.lastCoords.lon,
          ubicacionNueva.latitud,
          ubicacionNueva.longitud
        );

        console.log('📏 Distancia:', Math.round(distancia), 'metros');

        if (distancia > 200) {

          console.log('🔄 Actualizando clima por movimiento...');

          this.lastCoords = {
            lat: ubicacionNueva.latitud,
            lon: ubicacionNueva.longitud
          };

          this.lastLocationName = null;

          await this.loadWeather(ubicacionNueva);
        }
      }
    );

    if (!this.watchId) {
      console.error('❌ No se pudo iniciar watcher GPS');
    } else {
      console.log('✅ Seguimiento GPS activo');
    }
  }

  // =========================================================
  // 🛑 DETENER SEGUIMIENTO
  // =========================================================

  async stopLocationTracking(): Promise<void> {

    if (!this.watchId) {
      return;
    }

    await this.sosService.detenerWatchUbicacion(this.watchId);
    this.watchId = null;

    console.log('🛑 Seguimiento GPS detenido');
  }

  // =========================================================
  // 📏 CALCULAR DISTANCIA
  // =========================================================

  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {

    const R = 6371e3;

    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}