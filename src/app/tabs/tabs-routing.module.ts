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
        //canActivate: [authGuard]
      },
      {
        path: 'profile',
        loadChildren: () => import('../pages/users/profile/profile.module').then(m => m.ProfilePageModule),
        //canActivate: [authGuard]
      },
      {
        path: 'settings',
        loadChildren: () => import('../pages/users/settings/settings.module').then(m => m.SettingsPageModule),
        canActivate: [authGuard]
      },

      {
        path: 'eventos',
        loadChildren: () => import('../pages/users/eventos/eventos.module').then(m => m.EventosPageModule),
        //canActivate: [authGuard]
      },
      {
        path: 'crear-evento',
        loadChildren: () => import('../pages/users/crear-evento/crear-evento.module').then(m => m.CrearEventoPageModule),
        canActivate: [authGuard]
      },
      {
        path: 'evento-detalle/:id', // ✅ Corregido
        loadChildren: () => import('../pages/users/evento-detalle/evento-detalle.module').then(m => m.EventoDetallePageModule),
        canActivate: [authGuard]
      },
      {
        path: 'foro/:eventoId/:organizadorUid',
        loadChildren: () => import('../pages/users/foro/foro.module').then(m => m.ForoPageModule),
        canActivate: [authGuard]
      },
      {
        path: 'tab1',
        loadChildren: () => import('../tab1/tab1.module').then(m => m.Tab1PageModule),
        canActivate: [authGuard]
      },
      {
        path: 'tab2',
        loadChildren: () => import('../tab2/tab2.module').then(m => m.Tab2PageModule),
        canActivate: [authGuard]
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
