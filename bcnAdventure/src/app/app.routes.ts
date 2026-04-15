import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'map-selection/:themeId',
    loadComponent: () => import('./map-selection/map-selection.page').then( m => m.MapSelectionPage)
  },
  {
    path: 'map-details/:themeId/:mapId',
    loadComponent: () => import('./map-details/map-details.page').then(m => m.MapDetailsPage)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.page').then(m => m.SettingsPage)
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.page').then(m => m.AboutPage)
  },
  ];
