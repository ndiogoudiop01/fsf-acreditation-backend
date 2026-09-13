import { DomainEvent } from '../../../shared/kernel/domain/domain-event.js';
import type { StaffRole, UserKind, UserStatus } from '@prisma/client';

export class UserAccountCreatedEvent extends DomainEvent {
  readonly eventName = 'user.account_created';
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly kind: UserKind,
    public readonly role?: StaffRole | null,
    /** Absent pour une auto-inscription (demandeur) : l'acteur EST le sujet. */
    public readonly actorId?: string,
  ) {
    super();
  }
}

export class UserRoleUpdatedEvent extends DomainEvent {
  readonly eventName = 'user.role_updated';
  constructor(
    public readonly userId: string,
    public readonly fromRole: StaffRole | null,
    public readonly toRole: StaffRole,
    public readonly actorId: string,
  ) {
    super();
  }
}

export class UserStatusUpdatedEvent extends DomainEvent {
  readonly eventName = 'user.status_updated';
  constructor(
    public readonly userId: string,
    public readonly fromStatus: UserStatus,
    public readonly toStatus: UserStatus,
    public readonly actorId: string,
  ) {
    super();
  }
}

export class UserDeletedEvent extends DomainEvent {
  readonly eventName = 'user.deleted';
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly actorId: string,
  ) {
    super();
  }
}

export class UserLoginSucceededEvent extends DomainEvent {
  readonly eventName = 'user.login_succeeded';
  constructor(
    public readonly userId: string,
    public readonly email: string,
    /** L'utilisateur qui se connecte est son propre acteur. */
    public readonly actorId: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super();
  }
}

export class UserLoginFailedEvent extends DomainEvent {
  readonly eventName = 'user.login_failed';
  constructor(
    public readonly email: string,
    public readonly reason: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    /** Connu seulement si l'email correspond a un compte existant. */
    public readonly userId?: string,
  ) {
    super();
  }
}
