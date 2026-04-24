// src/app/pages/admin/dashboard/dashboard.module.ts

// 🔹 Importación del decorador NgModule para definir módulos en Angular
import { NgModule } from '@angular/core';

// 🔹 CommonModule contiene directivas básicas (ngIf, ngFor, etc.)
import { CommonModule } from '@angular/common';

// 🔹 IonicModule permite usar componentes de Ionic (ion-button, ion-card, etc.)
import { IonicModule } from '@ionic/angular';

// 🔹 RouterModule y Routes permiten definir rutas dentro del módulo
import { RouterModule, Routes } from '@angular/router';

// 🔹 Importación del componente principal de esta página
import { DashboardPage } from './dashboard.page';

// =========================
// 🛣️ CONFIGURACIÓN DE RUTAS
// =========================
const routes: Routes = [
  {
    path: '', // Ruta base del módulo (ej: /dashboard)
    component: DashboardPage // Componente que se mostrará
  }
];

// =========================
// 📦 DEFINICIÓN DEL MÓDULO
// =========================
@NgModule({

  // 🔹 Declaración de componentes que pertenecen a este módulo
  declarations: [
    DashboardPage
  ],

  // 🔹 Módulos que se importan para usar sus funcionalidades
  imports: [
    CommonModule,                 // Directivas básicas de Angular
    IonicModule,                  // Componentes de Ionic
    RouterModule.forChild(routes) // Configura las rutas internas del módulo
  ]
})
export class DashboardPageModule {}