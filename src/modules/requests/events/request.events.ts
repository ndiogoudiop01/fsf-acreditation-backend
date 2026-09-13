import { DomainEvent } from '../../../shared/kernel/domain/domain-event.js';

export class RequestSubmittedEvent extends DomainEvent {
  readonly eventName = 'request.submitted';
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
  ) {
    super();
  }
}

export class RequestComplementRequestedEvent extends DomainEvent {
  readonly eventName = 'request.complement_requested';
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly missingItem: string,
  ) {
    super();
  }
}

export class RequestDecidedEvent extends DomainEvent {
  readonly eventName = 'request.decided';
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly decision: 'VALIDATED' | 'REJECTED',
    public readonly reason: string | undefined,
    public readonly zoneIds: string[] = [],
  ) {
    super();
  }
}

export class RequestCancelledEvent extends DomainEvent {
  readonly eventName = 'request.cancelled';
  constructor(
    public readonly requestId: string,
    public readonly previousStatus: string,
  ) {
    super();
  }
}
