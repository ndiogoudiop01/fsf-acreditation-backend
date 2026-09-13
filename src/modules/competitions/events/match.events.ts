import { DomainEvent } from '../../../shared/kernel/domain/domain-event.js';

/** Consomme par `notifications` (rappel aux demandeurs) et `audit` (cahier §6, §20, §24). */
export class MatchUpdatedEvent extends DomainEvent {
  readonly eventName = 'match.updated';

  constructor(
    public readonly matchId: string,
    public readonly changedFields: string[],
  ) {
    super();
  }
}

export class MatchRequestsClosedEvent extends DomainEvent {
  readonly eventName = 'match.requests_closed';

  constructor(public readonly matchId: string) {
    super();
  }
}
