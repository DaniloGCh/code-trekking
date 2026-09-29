// src/app/pages/error/error-page/error-page.page.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { generarCodigoError } from 'src/app/core/utils/error-utils';

@Component({
  selector: 'app-error-page',
  templateUrl: './error-page.page.html',
  styleUrls: ['./error-page.page.scss'],
  standalone: false,
})
export class ErrorPagePage implements OnInit {

  codigo = '';
  mensaje = 'Ocurrió un problema inesperado al cargar esta pantalla.';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // El código viene por query param cuando la redirección la generó
    // GlobalErrorHandler o app.component.ts; si alguien llega directo a
    // /error sin ese dato, igual se genera uno para mantener la
    // consistencia visual.
    this.codigo = this.route.snapshot.queryParamMap.get('codigo') || generarCodigoError();

    const mensajeParam = this.route.snapshot.queryParamMap.get('mensaje');
    if (mensajeParam) {
      this.mensaje = mensajeParam;
    }
  }

  volverAlInicio() {
    this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }

  reintentar() {
    window.location.reload();
  }
}
