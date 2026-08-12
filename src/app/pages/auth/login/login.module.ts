// src/app/auth/login/login.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { LoginPage } from './login.page';

// =========================
// 🛣️ RUTAS DEL MÓDULO
// =========================
const routes: Routes = [
  {
    path: '',
    component: LoginPage
  }
];

// =========================
// 📦 MÓDULO LOGIN
// =========================
@NgModule({
  declarations: [
    LoginPage
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class LoginPageModule {}