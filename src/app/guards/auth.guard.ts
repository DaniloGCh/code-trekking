import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

// auth.guard.ts - Agrega timeout para evitar bloqueos infinitos
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Promise((resolve) => {
    // ✅ Timeout de seguridad: si Firebase no responde en 10s, redirigir
    const timeout = setTimeout(() => {
      router.navigateByUrl('/login', { replaceUrl: true });
      resolve(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();

      if (user) {
        resolve(true);
      } else {
        router.navigateByUrl('/login', { replaceUrl: true });
        resolve(false);
      }
    });
  });
};