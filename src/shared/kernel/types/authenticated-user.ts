import type { StaffRole, UserKind } from '@prisma/client';

/** Charge utile portee par le JWT et injectee via `@CurrentUser()`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  kind: UserKind;
  role: StaffRole | null;
  requesterProfileId?: string;
  permissions: string[];
}
