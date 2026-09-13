import { Injectable } from '@nestjs/common';
import type { AccreditationCategory, Zone } from '@prisma/client';
import { CategoriesService } from './categories.service.js';
import { ZonesService } from './zones.service.js';

export const ACCREDITATION_CONFIG_FACADE = Symbol(
  'ACCREDITATION_CONFIG_FACADE',
);

/** Point d'entree PUBLIC du module, utilise par `quotas`, `requests`, `accreditations`. */
export interface AccreditationConfigFacade {
  getCategory(id: string): Promise<AccreditationCategory>;
  getZone(id: string): Promise<Zone>;
}

@Injectable()
export class AccreditationConfigFacadeImpl implements AccreditationConfigFacade {
  constructor(
    private readonly categories: CategoriesService,
    private readonly zones: ZonesService,
  ) {}

  getCategory(id: string): Promise<AccreditationCategory> {
    return this.categories.get(id);
  }

  getZone(id: string): Promise<Zone> {
    return this.zones.get(id);
  }
}
