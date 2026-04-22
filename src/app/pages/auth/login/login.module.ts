// src/app/auth/login/login.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // ✅ Esto soluciona el error
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { LoginPage } from './login.page';

const routes: Routes = [
  {
    path: '',
    component: LoginPage
  }
];

@NgModule({
  declarations: [LoginPage],
  imports: [
    CommonModule,
    ReactiveFormsModule, // ✅ Indispensable para [formGroup]
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class LoginPageModule {}