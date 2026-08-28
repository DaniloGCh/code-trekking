import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-terminos-modal',
  templateUrl: './terminos-modal.component.html',
  styleUrls: ['./terminos-modal.component.scss'],
  standalone: false,
})
export class TerminosModalComponent {

  private modalCtrl = inject(ModalController);

  // ✅ Fecha actual para mostrar en el modal
  hoy = new Date().toLocaleDateString('es-CL', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric'
  });

  cerrar() {
    this.modalCtrl.dismiss({ aceptado: false });
  }

  aceptar() {
    this.modalCtrl.dismiss({ aceptado: true });
  }
}