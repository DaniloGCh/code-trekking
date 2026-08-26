import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import {
  IonicModule,
  IonicRouteStrategy
} from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// 🔥 Firebase
import {
  initializeApp,
  provideFirebaseApp
} from '@angular/fire/app';

import {
  getAuth,
  provideAuth
} from '@angular/fire/auth';

import {
  getFirestore,
  provideFirestore
} from '@angular/fire/firestore';

import { environment } from '../environments/environment';

// 🧩 Componentes
import { ManualSupervivenciaComponent } from './components/manual-supervivencia/manual-supervivencia.component';

// 🌐 HTTP
import {
  HttpClientModule,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

// 🔐 Interceptor
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// 📦 Swiper
import { register } from 'swiper/element/bundle';

register();


@NgModule({

  // 1. DECLARACIONES: Aquí registras los componentes, directivas o pipes 
  // creados por ti que pertenecen exclusivamente a este módulo.
  declarations: [
    AppComponent,                 // El componente raíz/principal de toda tu aplicación.
    ManualSupervivenciaComponent  // Un componente tuyo que se usará dentro de este módulo.
  ],

  // 2. IMPORTACIONES: Aquí traes módulos externos (de Angular, Ionic u otras librerías) 
  // para que sus componentes y herramientas puedan usarse en tus declaraciones.
  imports: [
    BrowserModule,       // Esencial para que la aplicación corra en un navegador web.
    HttpClientModule,    // Te permite hacer peticiones HTTP (GET, POST, etc.) a servidores o APIs.
    IonicModule.forRoot(), // Inicializa y configura los componentes visuales de Ionic globalmente.
    AppRoutingModule     // El sistema que maneja las rutas de navegación de tu aplicación.
  ],

  // 3. PROVEEDORES: Aquí se configuran los servicios, dependencias globales 
  // y configuraciones de nivel profundo (interceptores, Firebase, etc.).
  providers: [

    // Configuración de Ionic para manejar cómo se reutilizan y destruyen las vistas/páginas al navegar.
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    },

    // 🔥 CONFIGURACIÓN DE FIREBASE
    // Inicializa la aplicación de Firebase usando las credenciales de tu archivo 'environment'.
    provideFirebaseApp(() =>
      initializeApp(environment.firebaseConfig)
    ),

    // Habilita y provee el servicio de autenticación de Firebase (para login de usuarios).
    provideAuth(() =>
      getAuth()
    ),

    // Habilita y provee la base de datos en tiempo real Firestore de Firebase.
    provideFirestore(() =>
      getFirestore()
    ),

    // 🔐 INTERCEPTOR HTTP
    // Configura tu 'AuthInterceptor' para que intercepte automáticamente cada petición HTTP 
    // que hagas (por ejemplo, para añadir un token de seguridad a las cabeceras).
    // 'multi: true' permite que Angular pueda tener este y otros interceptores al mismo tiempo.
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }

  ],

  // 4. BOOTSTRAP: Le indica a Angular cuál es el componente principal 
  // que debe cargar e insertar en el archivo 'index.html' al arrancar la app.
  bootstrap: [AppComponent]

})

export class AppModule {}