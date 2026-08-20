// src/app/core/services/weather-global.service.ts

import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  firstValueFrom
} from 'rxjs';

import { WeatherService } from './weather.service';
import { SosService, UbicacionSOS } from './sos.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherGlobalService {

  // =========================================================
  // 🌡️ DATOS DEL CLIMA
  // =========================================================

  temperature =
    new BehaviorSubject<number | null>(null);

  description =
    new BehaviorSubject<string>('');

  icon =
    new BehaviorSubject<string>('partly-sunny');

  humidity =
    new BehaviorSubject<number | null>(null);

  windSpeed =
    new BehaviorSubject<number | null>(null);

  locationName =
    new BehaviorSubject<string>(
      'Ubicación desconocida'
    );


  // =========================================================
  // 📍 CONTROL DE UBICACIÓN
  // =========================================================

  private watchId: string | null = null;

  private lastCoords:
    { lat: number; lon: number } | null = null;


  // =========================================================
  // 🧠 CACHE DE UBICACIÓN
  // =========================================================

  private lastLocationName:
    string | null = null;


  constructor(
    private weatherService: WeatherService,
    private sosService: SosService
  ) {}


  // =========================================================
  // 🌤️ CARGAR CLIMA
  // =========================================================

  async loadWeather(): Promise<void> {

    try {

      console.log(
        '🌤️ Cargando clima...'
      );

      // -----------------------------------------------------
      // 📍 OBTENER GPS
      // -----------------------------------------------------

      const ubicacion =
        await this.sosService.obtenerUbicacion();

      console.log(
        '📍 GPS:',
        ubicacion.latitud,
        ubicacion.longitud
      );


      // -----------------------------------------------------
      // 🌤️ CONSULTAR OPENWEATHER
      // -----------------------------------------------------

      const weatherData: any =
        await firstValueFrom(
          this.weatherService.getWeatherByCoords(
            ubicacion.latitud,
            ubicacion.longitud
          )
        );


      // -----------------------------------------------------
      // 🌡️ TEMPERATURA
      // -----------------------------------------------------

      const temp =
        Math.round(
          weatherData.main.temp
        );

      this.temperature.next(temp);


      // -----------------------------------------------------
      // 🌧️ DESCRIPCIÓN
      // -----------------------------------------------------

      const main =
        weatherData.weather[0].main;

      const desc =
        weatherData.weather[0].description
          .toLowerCase();

      this.description.next(
        weatherData.weather[0].description
      );


      // -----------------------------------------------------
      // 🎨 ICONO
      // -----------------------------------------------------

      if (
        desc.includes('lluvia') ||
        desc.includes('rain') ||
        desc.includes('drizzle') ||
        desc.includes('shower')
      ) {

        this.icon.next('rainy');

      }
      else if (
        desc.includes('tormenta') ||
        main === 'Thunderstorm'
      ) {

        this.icon.next('thunderstorm');

      }
      else if (
        desc.includes('nube') ||
        main === 'Clouds'
      ) {

        this.icon.next('cloudy');

      }
      else if (
        main === 'Clear'
      ) {

        this.icon.next('sunny');

      }
      else {

        this.icon.next(
          'partly-sunny'
        );
      }


      // -----------------------------------------------------
      // 💧 HUMEDAD
      // -----------------------------------------------------

      this.humidity.next(
        weatherData.main.humidity
      );


      // -----------------------------------------------------
      // 🌬️ VIENTO
      // -----------------------------------------------------

      const windSpeed =
        Math.round(
          weatherData.wind.speed * 3.6
        );

      this.windSpeed.next(
        windSpeed
      );


      // -----------------------------------------------------
      // 📍 OBTENER NOMBRE DE UBICACIÓN
      // -----------------------------------------------------

      if (this.lastLocationName) {

        this.locationName.next(
          this.lastLocationName
        );

      }
      else {

        try {

          const locationData: any =
            await firstValueFrom(
              this.weatherService.getLocationName(
                ubicacion.latitud,
                ubicacion.longitud
              )
            );


          const address =
            locationData?.address;


          const lugar =
            address?.suburb ||
            address?.city ||
            address?.town ||
            address?.village ||
            address?.county ||
            address?.state ||
            'Ubicación actual';


          this.lastLocationName =
            lugar;

          this.locationName.next(
            lugar
          );

        } catch (error) {

          console.warn(
            '⚠️ No se pudo obtener nombre de ubicación:',
            error
          );

          // El clima sí funciona aunque
          // Nominatim falle.
          this.locationName.next(
            'Ubicación actual'
          );
        }
      }


      console.log(
        '✅ Clima cargado correctamente'
      );

    } catch (error: any) {

      console.error(
        '❌ Error cargando clima:',
        error
      );


      // -----------------------------------------------------
      // 🔐 PERMISO DENEGADO
      // -----------------------------------------------------

      if (
        error?.message ===
        'permiso-denegado'
      ) {

        this.locationName.next(
          'Permiso de ubicación denegado'
        );
      }


      // -----------------------------------------------------
      // 📍 UBICACIÓN NO DISPONIBLE
      // -----------------------------------------------------

      else if (
        error?.message ===
        'ubicacion-no-disponible'
      ) {

        this.locationName.next(
          'Ubicación no disponible'
        );
      }


      // -----------------------------------------------------
      // ⏱️ GPS LENTO
      // -----------------------------------------------------

      else if (
        error?.message ===
        'tiempo-excedido'
      ) {

        this.locationName.next(
          'GPS lento, intenta de nuevo'
        );
      }


      // -----------------------------------------------------
      // ❌ ERROR GENERAL
      // -----------------------------------------------------

      else {

        this.locationName.next(
          'Error de ubicación'
        );
      }


      // -----------------------------------------------------
      // 🧹 LIMPIAR DATOS DEL CLIMA
      // -----------------------------------------------------

      this.temperature.next(null);

      this.description.next(
        'Sin datos'
      );

      this.icon.next(
        'help-circle'
      );

      this.humidity.next(null);

      this.windSpeed.next(null);
    }
  }


  // =========================================================
  // 📡 INICIAR SEGUIMIENTO
  // =========================================================

  async startLocationTracking(): Promise<void> {

    // Evitar crear dos watchers
    if (this.watchId !== null) {

      console.log(
        '⚠️ El seguimiento del clima ya está activo'
      );

      return;
    }


    console.log(
      '📡 Iniciando seguimiento de ubicación para clima...'
    );


    this.watchId =
      await this.sosService.watchUbicacion(
        async (ubicacion: UbicacionSOS) => {

          console.log(
            '📍 Nueva posición:',
            ubicacion.latitud,
            ubicacion.longitud
          );


          // -------------------------------------------------
          // 📍 PRIMERA POSICIÓN
          // -------------------------------------------------

          if (!this.lastCoords) {

            this.lastCoords = {
              lat: ubicacion.latitud,
              lon: ubicacion.longitud
            };


            await this.loadWeather();

            return;
          }


          // -------------------------------------------------
          // 📏 CALCULAR DISTANCIA
          // -------------------------------------------------

          const distancia =
            this.calcularDistancia(
              this.lastCoords.lat,
              this.lastCoords.lon,
              ubicacion.latitud,
              ubicacion.longitud
            );


          console.log(
            '📏 Distancia recorrida:',
            Math.round(distancia),
            'metros'
          );


          // -------------------------------------------------
          // 🔄 ACTUALIZAR CADA 200 METROS
          // -------------------------------------------------

          if (distancia > 200) {

            console.log(
              '🔄 Actualizando clima...'
            );


            this.lastCoords = {
              lat: ubicacion.latitud,
              lon: ubicacion.longitud
            };


            // Limpiar cache de ubicación
            this.lastLocationName =
              null;


            await this.loadWeather();
          }

        }
      );


    if (!this.watchId) {

      console.error(
        '❌ No se pudo iniciar seguimiento GPS'
      );

    }
  }


  // =========================================================
  // 🛑 DETENER SEGUIMIENTO
  // =========================================================

  async stopLocationTracking(): Promise<void> {

    if (!this.watchId) {
      return;
    }


    await this.sosService
      .detenerWatchUbicacion(
        this.watchId
      );


    this.watchId = null;

    console.log(
      '🛑 Seguimiento de clima detenido'
    );
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

    const φ1 =
      lat1 * Math.PI / 180;

    const φ2 =
      lat2 * Math.PI / 180;

    const Δφ =
      (lat2 - lat1) *
      Math.PI / 180;

    const Δλ =
      (lon2 - lon1) *
      Math.PI / 180;


    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;


    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return R * c;
  }

}