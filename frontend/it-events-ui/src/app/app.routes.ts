import { Routes } from '@angular/router';
import { Signup } from './pages/signup/signup';
import { Login } from './pages/login/login';
import { roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'events' },
  { path: 'signup', component: Signup },
  { path: 'login', component: Login },
  { path: 'events', loadComponent: () => import('./pages/events/events').then(m => m.Events) },
  { path: 'events/:id', loadComponent: () => import('./pages/event-detail/event-detail').then(m => m.EventDetail) },
  {
    path: 'organizer',
    canActivate: [roleGuard('ORGANIZER')],
    loadComponent: () => import('./pages/organizer/organizer').then(m => m.Organizer)
  },
  {
  path: 'profile',
  canActivate: [roleGuard()],
  loadComponent: () => import('./pages/profile/profile').then(m => m.Profile)
  },
  {
    path: 'admin',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin)
  },
  { path: '**', redirectTo: 'events' }
];