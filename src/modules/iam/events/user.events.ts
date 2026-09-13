import { DomainEvent } from '../../../shared/kernel/domain/domain-event.js';
import type { UserKind } from '@prisma/client';

export class UserAccountCreatedEvent extends DomainEvent {
  readonly eventName = 'user.account_created';
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly kind: UserKind,
  ) {
    super();
  }
}
