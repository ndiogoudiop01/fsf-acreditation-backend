import { DomainEvent } from '../../../shared/kernel/domain/domain-event.js';

export class AccreditationGeneratedEvent extends DomainEvent {
  readonly eventName = 'accreditation.generated';
  constructor(
    public readonly accreditationId: string,
    public readonly requestId: string,
    public readonly requesterId: string,
  ) {
    super();
  }
}

export class AccreditationRevokedEvent extends DomainEvent {
  readonly eventName = 'accreditation.revoked';
  constructor(
    public readonly accreditationId: string,
    public readonly requestId: string,
    public readonly reason?: string,
  ) {
    super();
  }
}
