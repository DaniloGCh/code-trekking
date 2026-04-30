import { Component, OnInit, inject } from '@angular/core';
import { EventoService } from '../core/services/evento.service';
import { AuthService } from '../core/services/auth.service';
import { Observable } from 'rxjs';
import { Evento } from '../core/models/evento.model';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit {

  private eventoService = inject(EventoService);
  private authService = inject(AuthService);

  misEventos$: Observable<Evento[]> = this.eventoService.getMisEventos();
  currentUid: string | null = null;

  hayMensajesNuevos = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUid = user?.uid || null;
      this.recalcularIndicador();
    });

    // 🔥 ESCUCHA CUANDO ENTRAS AL FORO
    this.eventoService.foroVisto$.subscribe(() => {
      this.recalcularIndicador();
    });
  }

  async recalcularIndicador() {
    if (!this.currentUid) return;

    this.misEventos$.subscribe(async (eventos) => {

      this.hayMensajesNuevos = false;

      for (const ev of eventos) {
        if (!ev.id) continue;

        const cantidad = await this.eventoService.contarMensajesNuevos(
          ev.id,
          this.currentUid!
        );

        if (cantidad > 0) {
          this.hayMensajesNuevos = true;
          break;
        }
      }
    });
  }
}