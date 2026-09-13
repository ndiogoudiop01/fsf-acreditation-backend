import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { PermissionValue } from '../kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../kernel/types/authenticated-user.js';

/**
 * Verifie que l'utilisateur authentifie possede au moins une des permissions
 * requises par `@RequirePermissions(...)`. Applique le principe du moindre
 * privilege : une route sans metadata de permission reste accessible a tout
 * utilisateur authentifie (le controle fin reste au niveau des policies).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<PermissionValue[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    const hasPermission = Boolean(
      user?.permissions.some((p) => required.includes(p as PermissionValue)),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits necessaires pour cette action.",
      );
    }
    return true;
  }
}
