import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { authGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('../pages/users/home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../pages/users/profile/profile.module').then(m => m.ProfilePageModule),
        canActivate: [authGuard]
      },
      {
        path: 'settings',
        loadChildren: () => import('../pages/users/settings/settings.module').then(m => m.SettingsPageModule),
        canActivate: [authGuard]
      },

      {
        path: 'eventos',
        loadChildren: () => import('../pages/users/eventos/eventos.module').then(m => m.EventosPageModule)
      },
      {
        path: 'crear-evento',
        loadChildren: () => import('../pages/users/crear-evento/crear-evento.module').then(m => m.CrearEventoPageModule)
      },
      {
        path: 'evento-detalle/:id', // ✅ Corregido
        loadChildren: () => import('../pages/users/evento-detalle/evento-detalle.module').then(m => m.EventoDetallePageModule)
      },
      {
        path: 'tab1',
        loadChildren: () => import('../tab1/tab1.module').then(m => m.Tab1PageModule)
      },
      {
        path: 'tab2',
        loadChildren: () => import('../tab2/tab2.module').then(m => m.Tab2PageModule)
      },
      {
        path: 'tab3',
        loadChildren: () => import('../tab3/tab3.module').then(m => m.Tab3PageModule)
      },
      {
        path: '',
        redirectTo: 'home',   // ✅ AQUÍ ES LA CLAVE
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'tabs/home', // aquí sí es válido
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule { }
