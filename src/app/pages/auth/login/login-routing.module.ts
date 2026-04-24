// 🔹 Importación del decorador para definir módulos en Angular
import { NgModule } from '@angular/core';

// 🔹 Importación de herramientas de enrutamiento (rutas y módulo de rutas)
import { Routes, RouterModule } from '@angular/router';

// 🔹 Importación del componente que se cargará en esta ruta
import { LoginPage } from './login.page';

// =========================
// 🛣️ CONFIGURACIÓN DE RUTAS
// =========================
const routes: Routes = [
  {
    path: '',              // Ruta base (ej: /login)
    component: LoginPage   // Componente que se renderiza en esta ruta
  }
];

// =========================
// 📦 MÓDULO DE RUTEO
// =========================
@NgModule({

  // 🔹 Importa las rutas definidas para este módulo (lazy loading)
  imports: [
    RouterModule.forChild(routes)
  ],

  // 🔹 Exporta RouterModule para que esté disponible en otros módulos
  exports: [
    RouterModule
  ],
})
export class LoginPageRoutingModule {}