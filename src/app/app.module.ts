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
  getApp,
  initializeApp,
  provideFirebaseApp
} from '@angular/fire/app';

import {
  getAuth,
  provideAuth
} from '@angular/fire/auth';

import {
  initializeFirestore,
  provideFirestore
} from '@angular/fire/firestore';

// 📴 Caché persistente de Firestore (AngularFire no lo reexporta)
import {
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

import {
  getFunctions,
  provideFunctions
} from '@angular/fire/functions';

import { environment } from '../environments/environment';

// 🧩 Componentes
import { ManualSupervivenciaComponent } from './components/manual-supervivencia/manual-supervivencia.component';
import { TerminosModalModule } from './components/terminos-modal/terminos-modal.module';

// 🌐 HTTP
import {
  HttpClientModule,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

// 🔐 Interceptor
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// 🧯 Manejo global de errores (evita pantallas negras / código en pantalla)
import { ErrorHandler } from '@angular/core';
import { GlobalErrorHandler } from './core/global-error-handler';

// 📦 Swiper
import { register } from 'swiper/element/bundle';

register();


@NgModule({

  declarations: [
    AppComponent,
    ManualSupervivenciaComponent
  ],

  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    TerminosModalModule
  ],

  providers: [

    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    },

    // 🔥 CONFIGURACIÓN DE FIREBASE
    provideFirebaseApp(() =>
      initializeApp(environment.firebaseConfig)
    ),

    provideAuth(() =>
      getAuth()
    ),

    // 📴 Caché persistente en el dispositivo: sin internet se siguen
    // mostrando los últimos datos descargados (perfil, eventos, etc.)
    provideFirestore(() =>
      initializeFirestore(getApp(), {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      })
    ),

    // 🔹 Cloud Functions (para la pasarela de pago nativa)
    provideFunctions(() =>
      getFunctions()
    ),

    // 🔐 INTERCEPTOR HTTP
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    // 🧯 Captura cualquier error no controlado en toda la app
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }

  ],

  bootstrap: [AppComponent]

})

export class AppModule {}