import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CrearEventoPage } from './crear-evento.page';

const routes: Routes = [
  {
    path: '',
    component: CrearEventoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrearEventoPageRoutingModule {}
