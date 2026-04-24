import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EventoDetallePage } from './evento-detalle.page';

const routes: Routes = [
  {
    path: '',
    component: EventoDetallePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EventoDetallePageRoutingModule {}
