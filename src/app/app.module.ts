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

import {
  getFunctions,
  provideFunctions
} from '@angular/fire/functions';

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

  declarations: [
    AppComponent,
    ManualSupervivenciaComponent
  ],

  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule
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

    provideFirestore(() =>
      getFirestore()
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
    }

  ],

  bootstrap: [AppComponent]

})

export class AppModule {}