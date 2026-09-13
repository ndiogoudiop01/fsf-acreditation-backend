import { Entity } from './entity.js';
import type { DomainEvent } from './domain-event.js';

/**
 * Racine d'agregat : collecte les evenements de domaine leves pendant
 * l'execution d'un cas d'usage. `EventsModule` les publie APRES le commit
 * transactionnel (jamais avant, pour ne jamais notifier un changement qui
 * serait ensuite annule par un rollback).
 */
export abstract class AggregateRoot<Id> extends Entity<Id> {
  private readonly domainEvents: DomainEvent[] = [];

  protected raise(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }
}
