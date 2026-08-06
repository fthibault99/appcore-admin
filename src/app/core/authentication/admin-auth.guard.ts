import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminAuthenticationService } from './admin-authentication.service';

export const adminAuthGuard: CanActivateFn = () => {
  const authenticationService = inject(AdminAuthenticationService);
  const router = inject(Router);

  return authenticationService.getCurrentUser().pipe(
    map(() => true),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        return of(router.createUrlTree(['/login']));
      }
      return of(false);
    }),
  );
};
