import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AuthService } from 'src/app/core/services/auth.service';

export const noAuthGuard: CanActivateFn = () => {

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  // =========================
  // 🔐 VALIDACIÓN DE ACCESO INVERSO
  // =========================
  return new Promise((resolve) => {

    onAuthStateChanged(auth, async (user) => {

      // =========================
      // ❌ SIN SESIÓN
      // =========================
      if (!user) {
        resolve(true);
        return;
      }

      // =========================
      // 👤 CON SESIÓN → REDIRECCIÓN SEGÚN ROL
      // =========================
      const rol = await authService.getUserRole();

      if (rol === 'admin') {
        router.navigateByUrl('/dashboard', { replaceUrl: true });
      } else {
        router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }

      resolve(false);
    });
  });
};