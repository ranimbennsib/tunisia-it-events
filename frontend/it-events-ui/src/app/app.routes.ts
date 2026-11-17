import { Routes } from '@angular/router';
import { Signup } from './pages/signup/signup';
import { Login } from './pages/login/login';
import { roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/landing/landing').then(m => m.Landing) },
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
    path: 'my-payments',
    loadComponent: () => import('./pages/my-payments/my-payments').then(m => m.MyPayments),
    canActivate: [roleGuard('USER')]
  },
   {
    path: 'admin/payments',
    loadComponent: () => import('./pages/admin-payments/admin-payments').then(m => m.AdminPayments),
    canActivate: [roleGuard('ADMIN')]
  },
  {
    path: 'admin/payouts',
    loadComponent: () => import('./pages/admin-payouts/admin-payouts').then(m => m.AdminPayouts),
    canActivate: [roleGuard('ADMIN')]
  },
  {
    path: 'organizer/payouts',
    loadComponent: () =>
      import('./pages/organizer-payouts/organizer-payouts').then(m => m.OrganizerPayouts),
    canActivate: [roleGuard('ORGANIZER')]
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
  {
    path: 'organizer/events/:id/payments',
    loadComponent: () =>
      import('./pages/event-payments/event-payments').then(m => m.EventPayments),
    canActivate: [roleGuard('ORGANIZER')]
  },
  { path: 'calendar', loadComponent: () => import('./pages/calendar/calendar').then(m => m.Calendar) },
  { path: '**', redirectTo: '' }
];