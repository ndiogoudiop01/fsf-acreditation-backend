import type { DomainEvent } from '../domain/domain-event.js';

export const EVENT_BUS_PORT = Symbol('EVENT_BUS_PORT');

/** Bus d'evenements de domaine in-process (`@nestjs/event-emitter` derriere ce port). */
export interface EventBusPort {
  publish(event: DomainEvent): void;
  publishAll(events: DomainEvent[]): void;
}
