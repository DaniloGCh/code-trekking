import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const authGuard: CanActivateFn = () => {

  // =========================
  // 🔌 DEPENDENCIAS
  // =========================
  const auth = inject(Auth);
  const router = inject(Router);

  // =========================
  // 🔐 VALIDACIÓN DE SESIÓN
  // =========================
  return new Promise((resolve) => {

    onAuthStateChanged(auth, (user) => {

      if (user) {
        resolve(true);
      } else {
        router.navigateByUrl('/login', { replaceUrl: true });
        resolve(false);
      }
    });
  });
};