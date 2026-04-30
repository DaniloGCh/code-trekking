import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { EventoService } from 'src/app/core/services/evento.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Evento } from 'src/app/core/models/evento.model';

@Component({
  selector: 'app-foros',
  templateUrl: './lista-foros.page.html',
  styleUrls: ['./lista-foros.page.scss'],
  standalone: false,
})
export class ListaForosPage implements OnInit {

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private router = inject(Router);

  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();
  currentUid: string | null = null;

  mensajesNuevosMap: { [eventoId: string]: number } = {};

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUid = user?.uid || null;

      this.misEventos$.subscribe(async (eventos) => {
        if (!this.currentUid) return;

        for (const ev of eventos) {
          if (!ev.id) continue;

          const cantidad = await this.eventoService.contarMensajesNuevos(
            ev.id,
            this.currentUid
          );

          this.mensajesNuevosMap[ev.id] = cantidad;
        }
      });
    });
  }

  getMensajesNuevos(eventoId?: string): number {
    if (!eventoId) return 0;
    return this.mensajesNuevosMap[eventoId] || 0;
  }

  irAlForo(evento: Evento) {
    if (!evento.id) return;

    if (this.currentUid) {
      this.eventoService.marcarForoVisto(evento.id, this.currentUid);
      this.mensajesNuevosMap[evento.id] = 0;
    }

    this.router.navigateByUrl(
      `/tabs/foro/${evento.id}/${evento.creadoPor.uid}`
    );
  }
}