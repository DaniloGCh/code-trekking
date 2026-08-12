import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListaForosPage } from './lista-foros.page';

const routes: Routes = [
  {
    path: '',
    component: ListaForosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ListaForosPageRoutingModule {}
