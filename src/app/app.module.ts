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

    // Ionic
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    },

    // 🔥 Firebase
    provideFirebaseApp(() =>
      initializeApp(environment.firebaseConfig)
    ),

    provideAuth(() =>
      getAuth()
    ),

    provideFirestore(() =>
      getFirestore()
    ),

    // 🔐 HTTP Interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }

  ],

  bootstrap: [AppComponent]

})

export class AppModule {}