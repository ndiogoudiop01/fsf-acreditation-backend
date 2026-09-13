import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DomainEvent } from '../../shared/kernel/domain/domain-event.js';
import { AuditService } from './audit.service.js';

/**
 * Capture GENERIQUE de tous les evenements de domaine ('**', cf.
 * `EventsModule` en mode wildcard) — garantit que toute nouvelle action
 * metier finit dans le journal d'audit sans devoir enregistrer un listener
 * dedie a chaque fois (cahier §24 : traçabilite transversale).
 */
@Injectable()
export class AuditListener {
  constructor(private readonly audit: AuditService) {}

  @OnEvent('**')
  async onAnyDomainEvent(event: DomainEvent): Promise<void> {
    const {
      eventName,
      occurredAt: _occurredAt,
      ...fields
    } = event as DomainEvent & Record<string, unknown>;
    if (!eventName) return; // ignore les evenements internes non issus de DomainEvent

    const objectId = Object.entries(fields).find(([key]) =>
      key.endsWith('Id'),
    )?.[1] as string | undefined;

    await this.audit.record({
      action: eventName,
      objectType: eventName.split('.')[0] ?? 'unknown',
      objectId,
      newValue: fields,
    });
  }
}
