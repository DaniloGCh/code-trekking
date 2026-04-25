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

    onAuthStateChanged(auth, async (user) => {

      // =========================
      // ❌ SIN USUARIO
      // =========================
      if (!user) {
        router.navigateByUrl('/login', { replaceUrl: true });
        resolve(false);
        return;
      }

      // =========================
      // 👤 VALIDAR ROL
      // =========================
      const rol = await authService.getUserRole();

      if (rol === 'admin') {
        resolve(true);
      } else {
        router.navigateByUrl('tabs/home', { replaceUrl: true });
        resolve(false);
      }
    });
  });
};