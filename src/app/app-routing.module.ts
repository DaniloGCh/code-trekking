import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { noAuthGuard } from './guards/no-auth.guard';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
   {
    path: 'profile',
    loadChildren: () => import('./pages/users/profile/profile.module').then( m => m.ProfilePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/users/home/home.module').then( m => m.HomePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/auth/login/login.module').then( m => m.LoginPageModule),
    canActivate: [noAuthGuard]
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/auth/register/register.module').then( m => m.RegisterPageModule),
    canActivate: [noAuthGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/admin/dashboard/dashboard.module').then( m => m.DashboardPageModule),
    canActivate: [adminGuard]
  },
  {
    path: 'settings',
    loadChildren: () => import('./pages/users/settings/settings.module').then( m => m.SettingsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'eventos',
    loadChildren: () => import('./pages/users/eventos/eventos.module').then( m => m.EventosPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'crear-evento',
    loadChildren: () => import('./pages/users/crear-evento/crear-evento.module').then( m => m.CrearEventoPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'evento-detalle',
    loadChildren: () => import('./pages/users/evento-detalle/evento-detalle.module').then( m => m.EventoDetallePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'foro',
    loadChildren: () => import('./pages/users/foro/foro.module').then( m => m.ForoPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'lista-foros',
    loadChildren: () => import('./pages/users/lista-foros/lista-foros.module').then( m => m.ListaForosPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'mapa',
    loadChildren: () => import('./pages/users/mapa/mapa.module').then( m => m.MapaPageModule),
    canActivate: [authGuard]
  },




  
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
