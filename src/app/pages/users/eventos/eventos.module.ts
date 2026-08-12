import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { EventosPage } from './eventos.page';

// =========================
// 🛣️ RUTAS DEL MÓDULO
// =========================
const routes: Routes = [
  {
    path: '',
    component: EventosPage
  }
];

// =========================
// 📦 MÓDULO EVENTOS
// =========================
@NgModule({
  declarations: [
    EventosPage
  ],

  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes)
  ]
})
export class EventosPageModule {}