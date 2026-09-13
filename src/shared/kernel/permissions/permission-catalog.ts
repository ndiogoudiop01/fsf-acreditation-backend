import { StaffRole } from '@prisma/client';

/**
 * Catalogue statique des permissions, derive de la matrice de droits du
 * cahier des charges §23. Le controle grossier (route accessible ou non) se
 * fait ici via `PermissionsGuard` + `@RequirePermissions()`. Le controle fin
 * par perimetre (ex: "seulement les dossiers de sa commission") se fait dans
 * des classes `*.policy.ts` au niveau applicatif — cf. `docs/03-modules-et-frontieres.md`.
 */
export const Permission = {
  USERS_MANAGE: 'users:manage',
  COMPETITIONS_MANAGE: 'competitions:manage',
  COMPETITIONS_READ: 'competitions:read',
  MEDIA_MANAGE: 'media:manage',
  MEDIA_READ: 'media:read',
  REQUESTS_READ_ANY: 'requests:read:any',
  REQUESTS_READ_OWN: 'requests:read:own',
  REQUESTS_WRITE_OWN: 'requests:write:own',
  REQUESTS_COMPLEMENT_REQUEST: 'requests:complement:request',
  REQUESTS_VALIDATE: 'requests:validate',
  REQUESTS_ATTRIBUTE: 'requests:attribute',
  ACCREDITATIONS_GENERATE: 'accreditations:generate',
  ACCREDITATIONS_REVOKE: 'accreditations:revoke',
  SCAN_PERFORM: 'scan:perform',
  SCAN_READ: 'scan:read',
  DASHBOARD_READ: 'dashboard:read',
  EXPORT_DATA: 'export:data',
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

const ALL_PERMISSIONS = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<StaffRole, PermissionValue[]> = {
  [StaffRole.ADMIN]: ALL_PERMISSIONS,
  [StaffRole.RESPONSABLE_ACCREDITATION]: [
    Permission.COMPETITIONS_MANAGE,
    Permission.COMPETITIONS_READ,
    Permission.MEDIA_MANAGE,
    Permission.MEDIA_READ,
    Permission.REQUESTS_READ_ANY,
    Permission.REQUESTS_COMPLEMENT_REQUEST,
    Permission.REQUESTS_VALIDATE,
    Permission.REQUESTS_ATTRIBUTE,
    Permission.ACCREDITATIONS_GENERATE,
    Permission.ACCREDITATIONS_REVOKE,
    Permission.SCAN_READ,
    Permission.DASHBOARD_READ,
    Permission.EXPORT_DATA,
    Permission.AUDIT_READ,
  ],
  [StaffRole.COMMISSION_VALIDATION]: [
    Permission.COMPETITIONS_READ,
    Permission.MEDIA_READ,
    Permission.REQUESTS_READ_ANY,
    Permission.REQUESTS_COMPLEMENT_REQUEST,
    Permission.REQUESTS_VALIDATE,
    Permission.REQUESTS_ATTRIBUTE,
    Permission.ACCREDITATIONS_GENERATE,
    Permission.DASHBOARD_READ,
    Permission.EXPORT_DATA,
    Permission.AUDIT_READ,
  ],
  [StaffRole.AGENT_CONTROLE]: [Permission.SCAN_PERFORM, Permission.SCAN_READ],
  [StaffRole.SUPERVISEUR]: [
    Permission.COMPETITIONS_READ,
    Permission.MEDIA_READ,
    Permission.REQUESTS_READ_ANY,
    Permission.SCAN_READ,
    Permission.DASHBOARD_READ,
    Permission.EXPORT_DATA,
    Permission.AUDIT_READ,
  ],
};

export function permissionsForRole(role: StaffRole | null): PermissionValue[] {
  if (!role)
    return [Permission.REQUESTS_READ_OWN, Permission.REQUESTS_WRITE_OWN];
  return ROLE_PERMISSIONS[role] ?? [];
}
