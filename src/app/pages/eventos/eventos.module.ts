// src/app/pages/users/eventos/eventos.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { EventosPage } from './eventos.page';

const routes: Routes = [
  { path: '', component: EventosPage }
];

@NgModule({
  declarations: [EventosPage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class EventosPageModule {}