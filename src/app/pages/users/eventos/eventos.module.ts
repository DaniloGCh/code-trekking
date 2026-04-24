// src/app/pages/users/eventos/eventos.module.ts

// 🔹 Decorador para definir módulos en Angular
import { NgModule } from '@angular/core';

// 🔹 CommonModule permite usar directivas básicas como *ngIf, *ngFor, etc.
import { CommonModule } from '@angular/common';

// 🔹 IonicModule permite usar componentes de Ionic (ion-card, ion-list, etc.)
import { IonicModule } from '@ionic/angular';

// 🔹 RouterModule y Routes permiten configurar navegación dentro del módulo
import { RouterModule, Routes } from '@angular/router';

// 🔹 Componente principal de la página de eventos
import { EventosPage } from './eventos.page';

// =========================
// 🛣️ CONFIGURACIÓN DE RUTAS
// =========================
const routes: Routes = [
  { 
    path: '',              // Ruta base (ej: /eventos)
    component: EventosPage // Componente que se renderiza
  }
];

// =========================
// 📦 DEFINICIÓN DEL MÓDULO
// =========================
@NgModule({

  // 🔹 Componentes que pertenecen a este módulo
  declarations: [
    EventosPage
  ],

  // 🔹 Módulos necesarios para el funcionamiento
  imports: [
    CommonModule,            // Directivas básicas de Angular
    IonicModule,             // Componentes de Ionic
    RouterModule.forChild(routes), // Configuración de rutas (lazy loading)
  ]
})
export class EventosPageModule {}