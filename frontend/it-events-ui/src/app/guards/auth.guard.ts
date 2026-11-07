import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { Role } from '../models/auth.models';

export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const account = auth.currentAccount();
  if (account && (roles.length === 0 || roles.includes(account.role))) return true;
  return router.parseUrl('/login');
};