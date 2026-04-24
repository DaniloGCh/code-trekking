// src/app/guards/admin.guard.ts

// 🔹 Permite inyectar dependencias en funciones (no clases)
import { inject } from '@angular/core';

// 🔹 Tipado para guards y navegación entre rutas
import { CanActivateFn, Router } from '@angular/router';

// 🔹 Servicio de autenticación de Firebase y listener de sesión
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

// 🔹 Servicio propio para obtener datos del usuario (como el rol)
import { AuthService } from 'src/app/core/services/auth.service';

// 🔐 Guard que protege rutas solo para administradores
export const adminGuard: CanActivateFn = () => {

  // 🔹 Inyección de dependencias
  const auth = inject(Auth);                 // Servicio de autenticación
  const router = inject(Router);             // Servicio de navegación
  const authService = inject(AuthService);   // Servicio personalizado

  // 🔹 Retorna una promesa (Angular espera true o false para permitir acceso)
  return new Promise((resolve) => {

    // 🔄 Escucha cambios en el estado de autenticación (login/logout)
    onAuthStateChanged(auth, async (user) => {

      // ❌ Si NO hay usuario autenticado
      if (!user) {

        // Redirige al login
        router.navigateByUrl('/login', { replaceUrl: true });

        // Bloquea el acceso a la ruta
        resolve(false);
        return;
      }

      // ✅ Si hay usuario autenticado → obtener su rol desde Firestore
      const rol = await authService.getUserRole();

      // 🔐 Verificar si es administrador
      if (rol === 'admin') {

        // Permitir acceso a la ruta protegida
        resolve(true);

      } else {

        // ❌ Si es usuario normal → redirigir al home
        router.navigateByUrl('tabs/home', { replaceUrl: true });

        // Bloquear acceso
        resolve(false);
      }
    });
  });
};