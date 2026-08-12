// src/app/pages/users/foro/foro.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { ForoPage } from './foro.page';

const routes: Routes = [
  { path: '', component: ForoPage }
];

@NgModule({
  declarations: [ForoPage],
  imports: [
    CommonModule,
    FormsModule,    // ✅ Para [(ngModel)]
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class ForoPageModule {}