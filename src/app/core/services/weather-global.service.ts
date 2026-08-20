// src/app/core/services/weather-global.service.ts

import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  firstValueFrom
} from 'rxjs';

import {
  WeatherService
} from './weather.service';

import {
  SosService,
  UbicacionSOS
} from './sos.service';

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
    new BehaviorSubject<string>(
      'partly-sunny'
    );

  humidity =
    new BehaviorSubject<number | null>(null);

  windSpeed =
    new BehaviorSubject<number | null>(null);

  locationName =
    new BehaviorSubject<string>(
      'Ubicación desconocida'
    );


  // =========================================================
  // 📍 CONTROL GPS
  // =========================================================

  private watchId:
    string | null = null;

  private lastCoords:
    {
      lat: number;
      lon: number;
    } | null = null;


  // =========================================================
  // 🧠 CACHE UBICACIÓN
  // =========================================================

  private lastLocationName:
    string | null = null;


  // Evita varias cargas simultáneas
  private loadingWeather = false;


  constructor(
    private weatherService: WeatherService,
    private sosService: SosService
  ) {}


  // =========================================================
  // 🌤️ CARGAR CLIMA
  // =========================================================

  async loadWeather(
    ubicacion?: UbicacionSOS
  ): Promise<void> {

    // =======================================================
    // 🛑 EVITAR PETICIONES SIMULTÁNEAS
    // =======================================================

    if (this.loadingWeather) {

      console.log(
        '⏳ Ya se está cargando el clima'
      );

      return;
    }

    this.loadingWeather = true;

    try {

      console.log(
        '🌤️ Cargando clima...'
      );


      // =====================================================
      // 📍 SI NO RECIBIMOS UBICACIÓN,
      //    OBTENER GPS
      // =====================================================

      if (!ubicacion) {

        ubicacion =
          await this.sosService.obtenerUbicacion();
      }


      console.log(
        '📍 Coordenadas:',
        ubicacion.latitud,
        ubicacion.longitud
      );


      // =====================================================
      // 🌤️ OPENWEATHER
      // =====================================================

      const weatherData: any =
        await firstValueFrom(

          this.weatherService
            .getWeatherByCoords(
              ubicacion.latitud,
              ubicacion.longitud
            )
        );


      // =====================================================
      // 🌡️ TEMPERATURA
      // =====================================================

      const temp =
        Math.round(
          weatherData.main.temp
        );

      this.temperature.next(
        temp
      );


      // =====================================================
      // 🌧️ DESCRIPCIÓN
      // =====================================================

      const main =
        weatherData.weather[0].main;

      const desc =
        weatherData.weather[0]
          .description
          .toLowerCase();

      this.description.next(
        weatherData.weather[0]
          .description
      );


      // =====================================================
      // 🎨 ICONO
      // =====================================================

      if (
        desc.includes('lluvia') ||
        desc.includes('rain') ||
        desc.includes('drizzle') ||
        desc.includes('shower')
      ) {

        this.icon.next(
          'rainy'
        );

      }
      else if (
        desc.includes('tormenta') ||
        main === 'Thunderstorm'
      ) {

        this.icon.next(
          'thunderstorm'
        );

      }
      else if (
        desc.includes('nube') ||
        main === 'Clouds'
      ) {

        this.icon.next(
          'cloudy'
        );

      }
      else if (
        main === 'Clear'
      ) {

        this.icon.next(
          'sunny'
        );

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

      const windSpeed =
        Math.round(
          weatherData.wind.speed * 3.6
        );

      this.windSpeed.next(
        windSpeed
      );


      // =====================================================
      // 📍 NOMBRE DE UBICACIÓN
      // =====================================================

      if (
        !this.lastLocationName
      ) {

        try {

          const locationData: any =
            await firstValueFrom(

              this.weatherService
                .getLocationName(
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

        } catch (error) {

          console.warn(
            '⚠️ No se pudo obtener nombre de ubicación:',
            error
          );

          this.lastLocationName =
            'Ubicación actual';
        }
      }


      this.locationName.next(
        this.lastLocationName ||
        'Ubicación actual'
      );


      console.log(
        '✅ Clima cargado correctamente'
      );

    } catch (error: any) {

      console.error(
        '❌ Error cargando clima:',
        error
      );

      /*
       * IMPORTANTE:
       *
       * NO borramos el clima anterior.
       *
       * Si el GPS falla temporalmente,
       * mantenemos el último clima válido.
       */

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

      else {

        this.locationName.next(
          'Ubicación no disponible'
        );
      }

    } finally {

      this.loadingWeather =
        false;
    }
  }


  // =========================================================
  // 📡 INICIAR SEGUIMIENTO
  // =========================================================

  async startLocationTracking(): Promise<void> {

    // =======================================================
    // 🛑 EVITAR DUPLICAR WATCHER
    // =======================================================

    if (
      this.watchId !== null
    ) {

      console.log(
        '⚠️ El seguimiento GPS ya está activo'
      );

      return;
    }


    console.log(
      '📡 Iniciando seguimiento GPS...'
    );


    // =======================================================
    // 📍 OBTENER PRIMERA UBICACIÓN
    // =======================================================

    try {

      const ubicacion =
        await this.sosService
          .obtenerUbicacion();


      this.lastCoords = {

        lat:
          ubicacion.latitud,

        lon:
          ubicacion.longitud
      };


      // IMPORTANTE:
      // usamos la ubicación que ya obtuvimos

      await this.loadWeather(
        ubicacion
      );

    } catch (error) {

      console.error(
        '❌ No se pudo obtener ubicación inicial:',
        error
      );

      return;
    }


    // =======================================================
    // 📡 INICIAR WATCHER
    // =======================================================

    this.watchId =
      await this.sosService
        .watchUbicacion(

          async (
            ubicacion: UbicacionSOS
          ) => {

            console.log(
              '📍 Nueva posición:',
              ubicacion.latitud,
              ubicacion.longitud
            );


            // ===============================================
            // 📍 PRIMERA POSICIÓN
            // ===============================================

            if (
              !this.lastCoords
            ) {

              this.lastCoords = {

                lat:
                  ubicacion.latitud,

                lon:
                  ubicacion.longitud
              };

              return;
            }


            // ===============================================
            // 📏 DISTANCIA
            // ===============================================

            const distancia =
              this.calcularDistancia(

                this.lastCoords.lat,

                this.lastCoords.lon,

                ubicacion.latitud,

                ubicacion.longitud
              );


            console.log(
              '📏 Distancia:',
              Math.round(
                distancia
              ),
              'metros'
            );


            // ===============================================
            // 🔄 SOLO ACTUALIZAR +200m
            // ===============================================

            if (
              distancia > 200
            ) {

              console.log(
                '🔄 Actualizando clima por movimiento...'
              );


              this.lastCoords = {

                lat:
                  ubicacion.latitud,

                lon:
                  ubicacion.longitud
              };


              // Limpiar cache
              this.lastLocationName =
                null;


              // IMPORTANTE:
              // usamos directamente la ubicación
              // recibida por el watcher

              await this.loadWeather(
                ubicacion
              );
            }
          }
        );


    if (!this.watchId) {

      console.error(
        '❌ No se pudo iniciar watcher GPS'
      );

    } else {

      console.log(
        '✅ Seguimiento GPS activo'
      );
    }
  }


  // =========================================================
  // 🛑 DETENER SEGUIMIENTO
  // =========================================================

  async stopLocationTracking(): Promise<void> {

    if (
      !this.watchId
    ) {

      return;
    }


    await this.sosService
      .detenerWatchUbicacion(
        this.watchId
      );


    this.watchId =
      null;


    console.log(
      '🛑 Seguimiento GPS detenido'
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

    const R =
      6371e3;


    const φ1 =
      lat1 *
      Math.PI /
      180;


    const φ2 =
      lat2 *
      Math.PI /
      180;


    const Δφ =
      (lat2 - lat1) *
      Math.PI /
      180;


    const Δλ =
      (lon2 - lon1) *
      Math.PI /
      180;


    const a =
      Math.sin(
        Δφ / 2
      ) ** 2 +

      Math.cos(φ1) *
      Math.cos(φ2) *

      Math.sin(
        Δλ / 2
      ) ** 2;


    const c =
      2 *
      Math.atan2(

        Math.sqrt(a),

        Math.sqrt(
          1 - a
        )
      );


    return R * c;
  }

}