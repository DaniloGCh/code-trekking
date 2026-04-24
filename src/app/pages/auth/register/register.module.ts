// src/app/auth/register/register.module.ts

// 🔹 Importación del decorador para definir módulos en Angular
import { NgModule } from '@angular/core';

// 🔹 CommonModule permite usar directivas básicas como *ngIf, *ngFor, etc.
import { CommonModule } from '@angular/common';

// 🔹 ReactiveFormsModule habilita formularios reactivos ([formGroup], FormControl, validaciones)
import { ReactiveFormsModule } from '@angular/forms'; // ✅ Necesario para formularios

// 🔹 IonicModule permite usar componentes de Ionic (ion-input, ion-button, etc.)
import { IonicModule } from '@ionic/angular';

// 🔹 RouterModule y Routes permiten definir navegación dentro del módulo
import { RouterModule, Routes } from '@angular/router';

// 🔹 Componente principal de la página de registro
import { RegisterPage } from './register.page';

// =========================
// 🛣️ CONFIGURACIÓN DE RUTAS
// =========================
const routes: Routes = [
  {
    path: '', // Ruta base (ej: /register)
    component: RegisterPage // Componente que se renderiza
  }
];

// =========================
// 📦 DEFINICIÓN DEL MÓDULO
// =========================
@NgModule({

  // 🔹 Componentes que pertenecen a este módulo
  declarations: [
    RegisterPage
  ],

  // 🔹 Módulos necesarios para que funcione correctamente
  imports: [
    CommonModule,            // Directivas básicas de Angular
    ReactiveFormsModule,     // ✅ Formularios reactivos
    IonicModule,             // Componentes de Ionic
    RouterModule.forChild(routes), // Configuración de rutas (lazy loading)
  ]
})
export class RegisterPageModule {}