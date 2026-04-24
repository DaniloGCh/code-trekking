// src/app/auth/login/login.module.ts

// 🔹 Importación del decorador para definir módulos en Angular
import { NgModule } from '@angular/core';

// 🔹 CommonModule incluye directivas básicas como *ngIf, *ngFor, etc.
import { CommonModule } from '@angular/common';

// 🔹 ReactiveFormsModule permite trabajar con formularios reactivos ([formGroup], FormControl, etc.)
import { ReactiveFormsModule } from '@angular/forms'; // ✅ Esto soluciona el error de formularios

// 🔹 IonicModule permite usar componentes de Ionic (ion-input, ion-button, etc.)
import { IonicModule } from '@ionic/angular';

// 🔹 RouterModule y Routes permiten definir rutas dentro del módulo
import { RouterModule, Routes } from '@angular/router';

// 🔹 Componente principal de la página de login
import { LoginPage } from './login.page';

// =========================
// 🛣️ CONFIGURACIÓN DE RUTAS
// =========================
const routes: Routes = [
  {
    path: '', // Ruta base (ej: /login)
    component: LoginPage // Componente que se renderiza
  }
];

// =========================
// 📦 DEFINICIÓN DEL MÓDULO
// =========================
@NgModule({

  // 🔹 Componentes que pertenecen a este módulo
  declarations: [
    LoginPage
  ],

  // 🔹 Módulos importados necesarios para el funcionamiento
  imports: [
    CommonModule,            // Directivas básicas de Angular
    ReactiveFormsModule,     // ✅ Necesario para usar formularios reactivos ([formGroup])
    IonicModule,             // Componentes de Ionic
    RouterModule.forChild(routes), // Configura rutas internas del módulo (lazy loading)
  ]
})
export class LoginPageModule {}