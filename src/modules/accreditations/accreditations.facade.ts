import { Injectable } from '@nestjs/common';
import type { Accreditation } from '@prisma/client';
import {
  AccreditationsService,
  type GenerateAccreditationOptions,
} from './accreditations.service.js';

export const ACCREDITATIONS_FACADE = Symbol('ACCREDITATIONS_FACADE');

/** Point d'entree PUBLIC du module, utilise par `requests` et `access-control`. */
export interface AccreditationsFacade {
  generateAccreditation(
    requestId: string,
    zoneIds: string[],
    options?: GenerateAccreditationOptions,
  ): Promise<Accreditation>;
  findByRawToken(rawToken: string): Promise<Accreditation | null>;
}

@Injectable()
export class AccreditationsFacadeImpl implements AccreditationsFacade {
  constructor(private readonly accreditationsService: AccreditationsService) {}

  generateAccreditation(
    requestId: string,
    zoneIds: string[],
    options?: GenerateAccreditationOptions,
  ): Promise<Accreditation> {
    return this.accreditationsService.generateAccreditation(
      requestId,
      zoneIds,
      options,
    );
  }

  findByRawToken(rawToken: string): Promise<Accreditation | null> {
    return this.accreditationsService.findByRawToken(rawToken);
  }
}
