// src/app/auth/register/register.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms'; // ✅
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { RegisterPage } from './register.page';

const routes: Routes = [
  {
    path: '',
    component: RegisterPage
  }
];

@NgModule({
  declarations: [RegisterPage],
  imports: [
    CommonModule,
    ReactiveFormsModule, // ✅
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class RegisterPageModule {}