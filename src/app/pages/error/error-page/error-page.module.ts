// src/app/pages/error/error-page/error-page.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { ErrorPagePage } from './error-page.page';

const routes: Routes = [
  { path: '', component: ErrorPagePage }
];

@NgModule({
  declarations: [ErrorPagePage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class ErrorPagePageModule {}
