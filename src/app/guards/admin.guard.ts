import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AuthService } from 'src/app/core/services/auth.service';

export const adminGuard: CanActivateFn = () => {

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  // =========================
  // 🔐 VALIDACIÓN DE ACCESO
  // =========================
  return new Promise((resolve) => {

    // ✅ Timeout de seguridad
    const timeout = setTimeout(() => {

      router.navigateByUrl('/login', {
        replaceUrl: true
      });

      resolve(false);

    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      clearTimeout(timeout);
      unsubscribe();

      // =========================
      // ❌ SIN USUARIO
      // =========================
      if (!user) {

        router.navigateByUrl('/login', {
          replaceUrl: true
        });

        resolve(false);
        return;
      }

      try {

        // =========================
        // 👤 VALIDAR ROL
        // =========================
        const rol = await authService.getUserRole();

        if (rol === 'admin') {

          resolve(true);

        } else {

          router.navigateByUrl('/tabs/home', {
            replaceUrl: true
          });

          resolve(false);
        }

      } catch (error) {

        console.error('Error validando rol:', error);

        router.navigateByUrl('/login', {
          replaceUrl: true
        });

        resolve(false);
      }
    });
  });
};