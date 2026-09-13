import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DomainEvent } from '../../shared/kernel/domain/domain-event.js';
import type { EventBusPort } from '../../shared/kernel/ports/event-bus.port.js';

/**
 * Bus d'evenements de domaine in-process. Les listeners (`notifications`,
 * `audit`) s'abonnent via `@OnEvent(EventName)`. Choix assume : pas d'outbox
 * transactionnel pour le MVP (cf. ADR 0002) — si un listener echoue,
 * l'evenement n'est pas rejoue automatiquement. Acceptable ici car les
 * effets (email, audit) sont eux-memes journalises et rejouables
 * manuellement ; a reconsiderer si le volume ou la criticite augmentent.
 */
@Injectable()
export class DomainEventBusService implements EventBusPort {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: DomainEvent): void {
    this.emitter.emit(event.eventName, event);
  }

  publishAll(events: DomainEvent[]): void {
    for (const event of events) this.publish(event);
  }
}
