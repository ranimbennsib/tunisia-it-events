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
    {
    path: 'my-registrations',
    loadComponent: () =>
      import('./pages/my-registrations/my-registrations').then(m => m.MyRegistrations),
    canActivate: [roleGuard('USER')]
  },
    {
    path: 'favorites',
    loadComponent: () => import('./pages/favorites/favorites').then(m => m.Favorites),
    canActivate: [roleGuard('USER')]
  },
    {
    path: 'organizer/events/:id/participants',
    loadComponent: () =>
      import('./pages/event-participants/event-participants').then(m => m.EventParticipants),
    canActivate: [roleGuard('ORGANIZER')]
  },
  { path: '**', redirectTo: 'events' }
];