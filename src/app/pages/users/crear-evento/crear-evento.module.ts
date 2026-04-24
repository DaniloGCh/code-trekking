// src/app/pages/users/crear-evento/crear-evento.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { CrearEventoPage } from './crear-evento.page';

const routes: Routes = [
  { path: '', component: CrearEventoPage }
];

@NgModule({
  declarations: [CrearEventoPage],
  imports: [
    CommonModule,
    ReactiveFormsModule, // ✅ Necesario para [formGroup]
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class CrearEventoPageModule {}