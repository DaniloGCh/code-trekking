// src/app/pages/users/evento-detalle/evento-detalle.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { EventoDetallePage } from './evento-detalle.page';

const routes: Routes = [
  { path: '', component: EventoDetallePage }
];

@NgModule({
  declarations: [EventoDetallePage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class EventoDetallePageModule {}