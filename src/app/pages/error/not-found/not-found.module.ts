// src/app/pages/error/not-found/not-found.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundPage } from './not-found.page';

const routes: Routes = [
  { path: '', component: NotFoundPage }
];

@NgModule({
  declarations: [NotFoundPage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class NotFoundPageModule {}
