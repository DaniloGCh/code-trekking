// src/app/guards/no-auth.guard.ts

// 🔹 Permite inyectar dependencias dentro de funciones (sin usar clases)
import { inject } from '@angular/core';

// 🔹 Tipos necesarios para guards y navegación
import { CanActivateFn, Router } from '@angular/router';

// 🔹 Servicio de autenticación de Firebase y listener de estado
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

// 🔹 Servicio personalizado para obtener datos del usuario (como el rol)
import { AuthService } from 'src/app/core/services/auth.service';

// 🚫 Guard que evita acceso a rutas de login/register si el usuario YA está autenticado
export const noAuthGuard: CanActivateFn = () => {

  // 🔹 Inyección de dependencias
  const auth = inject(Auth);                 // Servicio de autenticación
  const router = inject(Router);             // Servicio de navegación
  const authService = inject(AuthService);   // Servicio para obtener rol

  // 🔹 Retorna una promesa (true = permite acceso, false = bloquea)
  return new Promise((resolve) => {

    // 🔄 Escucha el estado de autenticación
    onAuthStateChanged(auth, async (user) => {

      // ✅ Si NO hay usuario autenticado
      if (!user) {

        // Permite acceso a login o register
        resolve(true);
        return;
      }

      // ⚠️ Si hay sesión activa → obtener rol del usuario
      const rol = await authService.getUserRole();

      // 🔀 Redirigir según el rol
      if (rol === 'admin') {

        // Admin → dashboard
        router.navigateByUrl('/dashboard', { replaceUrl: true });

      } else {

        // Usuario normal → home
        router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }

      // ❌ Bloquear acceso a login/register
      resolve(false);
    });
  });
};