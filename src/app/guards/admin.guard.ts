// src/app/guards/admin.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AuthService } from 'src/app/core/services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No hay sesión → ir al login
        router.navigateByUrl('/login', { replaceUrl: true });
        resolve(false);
        return;
      }

      // Hay sesión → verificar si es admin
      const rol = await authService.getUserRole();

      if (rol === 'admin') {
        resolve(true);
      } else {
        // Es user normal → redirigir a home
        router.navigateByUrl('tabs/home', { replaceUrl: true });
        resolve(false);
      }
    });
  });
};