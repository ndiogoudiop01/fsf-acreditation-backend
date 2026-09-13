import { SetMetadata } from '@nestjs/common';
import type { PermissionValue } from '../kernel/permissions/permission-catalog.js';

export const PERMISSIONS_KEY = 'permissions';

/** Exige au moins une des permissions listees (verifie par `PermissionsGuard`). */
export const RequirePermissions = (...permissions: PermissionValue[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
