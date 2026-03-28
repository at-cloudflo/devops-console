import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

export function roleGuard(...requiredRoles: string[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    const roles = route.data?.['roles'] as string[] | undefined ?? requiredRoles;
    if (!roles.length || auth.hasAnyRole(...roles)) {
      return true;
    }
    return router.createUrlTree(['/dashboard']);
  };
}
