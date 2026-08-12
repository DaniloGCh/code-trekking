// src/app/pages/admin/dashboard/dashboard.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { DashboardPage } from './dashboard.page';

// =========================
// 🛣️ RUTAS
// =========================
const routes: Routes = [
  {
    path: '',
    component: DashboardPage,
  },
];

// =========================
// 📦 MÓDULO
// =========================
@NgModule({
  declarations: [
    DashboardPage,
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class DashboardPageModule {}