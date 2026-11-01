import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { TerminosModalComponent } from './terminos-modal.component';

// =========================
// 📦 MÓDULO COMPARTIDO DEL MODAL DE TÉRMINOS
// =========================
// Se usa desde el registro, Configuración, Pagos, el panel admin y el
// control global de re-aceptación (AppComponent).
@NgModule({
  declarations: [TerminosModalComponent],
  imports: [
    CommonModule,
    IonicModule,
  ],
  exports: [TerminosModalComponent]
})
export class TerminosModalModule {}
