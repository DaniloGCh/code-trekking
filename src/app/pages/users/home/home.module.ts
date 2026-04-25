// src/app/pages/home/home.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';
import { ExploreContainerComponentModule } from "src/app/explore-container/explore-container.module";
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';


const routes: Routes = [
  {
    path: '',
    component: HomePage
  }
];

@NgModule({
  declarations: [HomePage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes),
    ExploreContainerComponentModule
],
schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule {}