// src/app/guards/no-auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AuthService } from 'src/app/core/services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // ✅ No hay sesión → puede ver login/register
        resolve(true);
        return;
      }

      // Hay sesión → redirigir según su rol
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