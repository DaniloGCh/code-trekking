// src/app/core/services/weather-global.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

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
    new BehaviorSubject<string>('Cargando...');

  icon =
    new BehaviorSubject<string>('partly-sunny');

  humidity =
    new BehaviorSubject<number | null>(null);

  windSpeed =
    new BehaviorSubject<number | null>(null);

  locationName =
    new BehaviorSubject<string>(
      'Obteniendo ubicación...'
    );


  // =========================================================
  // 📍 CONTROL GPS
  // =========================================================

  private watchId: string | null = null;

  private lastCoords:
    { lat: number; lon: number } | null = null;


  // =========================================================
  // 🧠 CACHE UBICACIÓN
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
        '🌤️ Iniciando carga del clima...'
      );


      // =====================================================
      // 📍 GPS
      // =====================================================

      const ubicacion =
        await this.sosService.obtenerUbicacion();


      console.log(
        '📍 Coordenadas GPS:',
        ubicacion.latitud,
        ubicacion.longitud
      );


      // =====================================================
      // 🌤️ OPENWEATHER
      // =====================================================

      const weatherData: any =
        await firstValueFrom(
          this.weatherService.getWeatherByCoords(
            ubicacion.latitud,
            ubicacion.longitud
          )
        );


      console.log(
        '🌤️ OpenWeather:',
        weatherData
      );


      // =====================================================
      // 🌡️ TEMPERATURA
      // =====================================================

      this.temperature.next(
        Math.round(
          weatherData.main.temp
        )
      );


      // =====================================================
      // 🌧️ DESCRIPCIÓN
      // =====================================================

      const main =
        weatherData.weather?.[0]?.main || '';

      const desc =
        weatherData.weather?.[0]?.description || '';

      this.description.next(desc);


      // =====================================================
      // 🎨 ICONO
      // =====================================================

      const descLower =
        desc.toLowerCase();


      if (
        descLower.includes('lluvia') ||
        descLower.includes('rain') ||
        descLower.includes('drizzle') ||
        descLower.includes('shower')
      ) {

        this.icon.next('rainy');

      }
      else if (
        main === 'Thunderstorm' ||
        descLower.includes('tormenta')
      ) {

        this.icon.next('thunderstorm');

      }
      else if (
        main === 'Clouds' ||
        descLower.includes('nube')
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


      // =====================================================
      // 💧 HUMEDAD
      // =====================================================

      this.humidity.next(
        weatherData.main.humidity
      );


      // =====================================================
      // 🌬️ VIENTO
      // =====================================================

      this.windSpeed.next(
        Math.round(
          weatherData.wind.speed * 3.6
        )
      );


      // =====================================================
      // 📍 NOMBRE DE UBICACIÓN
      // =====================================================

      if (this.lastLocationName) {

        this.locationName.next(
          this.lastLocationName
        );

      } else {

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
            '⚠️ Nominatim no disponible:',
            error
          );

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
        '❌ ERROR COMPLETO DEL CLIMA:',
        error
      );


      if (
        error?.message ===
        'permiso-denegado'
      ) {

        this.locationName.next(
          'Permiso de ubicación denegado'
        );

      }
      else if (
        error?.message ===
        'tiempo-excedido'
      ) {

        this.locationName.next(
          'GPS lento, intenta de nuevo'
        );

      }
      else if (
        error?.message ===
        'ubicacion-no-disponible'
      ) {

        this.locationName.next(
          'Ubicación no disponible'
        );

      }
      else {

        this.locationName.next(
          'Error de ubicación'
        );
      }


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
  // 📡 SEGUIMIENTO GPS
  // =========================================================

  async startLocationTracking(): Promise<void> {

    if (this.watchId !== null) {

      console.log(
        '⚠️ Watcher ya iniciado'
      );

      return;
    }


    console.log(
      '📡 Iniciando seguimiento GPS...'
    );


    // =====================================================
    // 📍 PRIMERA UBICACIÓN
    // =====================================================

    await this.loadWeather();


    // =====================================================
    // 📡 CREAR WATCHER
    // =====================================================

    this.watchId =
      await this.sosService.watchUbicacion(
        async (ubicacion: UbicacionSOS) => {

          console.log(
            '📍 Nueva posición GPS:',
            ubicacion.latitud,
            ubicacion.longitud
          );


          // Primera posición
          if (!this.lastCoords) {

            this.lastCoords = {
              lat: ubicacion.latitud,
              lon: ubicacion.longitud
            };

            return;
          }


          const distancia =
            this.calcularDistancia(
              this.lastCoords.lat,
              this.lastCoords.lon,
              ubicacion.latitud,
              ubicacion.longitud
            );


          console.log(
            '📏 Distancia:',
            Math.round(distancia),
            'm'
          );


          // Actualizar clima cada 200 m
          if (distancia > 200) {

            console.log(
              '🔄 Actualizando clima...'
            );


            this.lastCoords = {
              lat: ubicacion.latitud,
              lon: ubicacion.longitud
            };


            this.lastLocationName =
              null;


            await this.loadWeather();
          }
        }
      );


    if (!this.watchId) {

      console.error(
        '❌ No se pudo iniciar watcher GPS'
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
      '🛑 Seguimiento GPS detenido'
    );
  }


  // =========================================================
  // 📏 DISTANCIA
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