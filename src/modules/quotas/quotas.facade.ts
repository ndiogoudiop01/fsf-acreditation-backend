import { Injectable } from '@nestjs/common';
import { QuotasService, type ReservationResult } from './quotas.service.js';

export const QUOTAS_FACADE = Symbol('QUOTAS_FACADE');

/** Point d'entree PUBLIC du module `quotas`, utilise par `requests` et `accreditations`. */
export interface QuotasFacade {
  reserveSlot(matchId: string, categoryId: string): Promise<ReservationResult>;
  releaseSlot(matchId: string, categoryId: string): Promise<void>;
}

@Injectable()
export class QuotasFacadeImpl implements QuotasFacade {
  constructor(private readonly quotasService: QuotasService) {}

  reserveSlot(matchId: string, categoryId: string): Promise<ReservationResult> {
    return this.quotasService.reserveSlot(matchId, categoryId);
  }

  releaseSlot(matchId: string, categoryId: string): Promise<void> {
    return this.quotasService.releaseSlot(matchId, categoryId);
  }
}
