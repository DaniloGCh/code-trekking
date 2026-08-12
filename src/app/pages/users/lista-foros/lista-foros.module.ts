import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ListaForosPageRoutingModule } from './lista-foros-routing.module';

import { ListaForosPage } from './lista-foros.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ListaForosPageRoutingModule
  ],
  declarations: [ListaForosPage]
})
export class ListaForosPageModule {}
