import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { RegisterPage } from './register.page';
import { TerminosModalComponent } from 'src/app/components/terminos-modal/terminos-modal.component';


// =========================
// 🛣️ RUTAS DEL MÓDULO
// =========================
const routes: Routes = [
  {
    path: '',
    component: RegisterPage,
    
  }
];

// =========================
// 📦 MÓDULO REGISTER
// =========================
@NgModule({
  declarations: [
    RegisterPage,
    TerminosModalComponent 
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class RegisterPageModule {}