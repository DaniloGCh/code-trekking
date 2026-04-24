// src/app/guards/auth.guard.ts

// 🔹 Permite inyectar dependencias dentro de funciones
import { inject } from '@angular/core';

// 🔹 Tipos necesarios para crear guards y manejar navegación
import { CanActivateFn, Router } from '@angular/router';

// 🔹 Servicio de autenticación de Firebase
import { Auth } from '@angular/fire/auth';

// 🔹 Función que escucha cambios en el estado de autenticación
import { onAuthStateChanged } from '@angular/fire/auth';

// 🔐 Guard que protege rutas solo para usuarios autenticados
export const authGuard: CanActivateFn = () => {

  // 🔹 Inyección de dependencias
  const auth = inject(Auth);       // Servicio de autenticación
  const router = inject(Router);   // Servicio de navegación

  // 🔹 Retorna una promesa (Angular espera true o false)
  return new Promise((resolve) => {

    // 🔄 Escucha si el usuario está autenticado o no
    onAuthStateChanged(auth, (user) => {

      // ✅ Si hay usuario logueado
      if (user) {

        // Permitir acceso a la ruta
        resolve(true);

      } else {

        // ❌ Si no hay sesión → redirigir al login
        router.navigateByUrl('/login', { replaceUrl: true });

        // Bloquear acceso
        resolve(false);
      }
    });
  });
};