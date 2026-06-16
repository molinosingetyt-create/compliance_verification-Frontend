import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Exige un permiso concreto.
 * @param required código (ej. `sampling:view`)
 * @param redirectIfDenied ruta preferida si no cumple `required` (solo se usa si el usuario
 *   tiene permiso para entrar a esa ruta; evita bucles de redirección con sesiones sin permisos).
 */
/** Permite entrar si el usuario tiene al menos uno de los permisos indicados. */
export function anyPermissionGuard(...required: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }
    if (required.some((code) => auth.hasPermission(code))) {
      return true;
    }
    if (auth.hasPermission('sampling:view')) {
      return router.parseUrl('/compliance');
    }
    return router.parseUrl('/login?motivo=sin_permiso');
  };
}

export function permissionGuard(required: string, redirectIfDenied?: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }
    if (auth.hasPermission(required)) {
      return true;
    }
    if (
      redirectIfDenied === '/configuracion' &&
      (auth.hasPermission('users:manage') || auth.hasPermission('catalog:manage'))
    ) {
      return router.parseUrl(
        auth.hasPermission('users:manage') ? '/configuracion/usuarios' : '/configuracion/productos'
      );
    }
    if (redirectIfDenied === '/configuracion/productos' && auth.hasPermission('catalog:manage')) {
      return router.parseUrl('/configuracion/productos');
    }
    if (redirectIfDenied === '/compliance' && auth.hasPermission('sampling:view')) {
      return router.parseUrl('/compliance');
    }
    if (auth.hasPermission('catalog:manage')) {
      return router.parseUrl('/configuracion/productos');
    }
    if (auth.hasPermission('users:manage')) {
      return router.parseUrl('/configuracion/usuarios');
    }
    if (auth.hasPermission('sampling:view')) {
      return router.parseUrl('/compliance');
    }
    return router.parseUrl('/login?motivo=sin_permiso');
  };
}
