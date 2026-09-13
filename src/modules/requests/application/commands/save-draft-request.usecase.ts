import { Inject, Injectable } from '@nestjs/common';
import {
  RequestStatus,
  type AccreditationRequest,
  type RoleInEvent,
} from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import {
  MATCHES_FACADE,
  type MatchesFacade,
} from '../../../competitions/competitions.facade.js';
import {
  ACCREDITATION_CONFIG_FACADE,
  type AccreditationConfigFacade,
} from '../../../accreditation-config/accreditation-config.facade.js';

export interface SaveDraftInput {
  requesterId: string;
  matchId: string;
  categoryRequestedId: string;
  roleInEvent?: RoleInEvent;
  needsDesk?: boolean;
  needsPower?: boolean;
  needsLanWifi?: boolean;
  carPlateNumber?: string;
  preferredZoneIds?: string[];
}

/** Cree ou met a jour le brouillon (cahier §9, §13 : "demande creee en brouillon"). */
@Injectable()
export class SaveDraftRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MATCHES_FACADE) private readonly matches: MatchesFacade,
    @Inject(ACCREDITATION_CONFIG_FACADE)
    private readonly accreditationConfig: AccreditationConfigFacade,
  ) {}

  async execute(input: SaveDraftInput): Promise<AccreditationRequest> {
    await this.matches.getMatch(input.matchId);
    await this.accreditationConfig.getCategory(input.categoryRequestedId);

    const logistics = {
      roleInEvent: input.roleInEvent,
      needsDesk: input.needsDesk,
      needsPower: input.needsPower,
      needsLanWifi: input.needsLanWifi,
      carPlateNumber: input.carPlateNumber,
      preferredZoneIds: input.preferredZoneIds,
    };

    const existingDraft = await this.prisma.accreditationRequest.findFirst({
      where: {
        requesterId: input.requesterId,
        matchId: input.matchId,
        status: RequestStatus.DRAFT,
      },
    });
    if (existingDraft) {
      return this.prisma.accreditationRequest.update({
        where: { id: existingDraft.id },
        data: { categoryRequestedId: input.categoryRequestedId, ...logistics },
      });
    }

    return this.prisma.accreditationRequest.create({
      data: {
        requesterId: input.requesterId,
        matchId: input.matchId,
        categoryRequestedId: input.categoryRequestedId,
        status: RequestStatus.DRAFT,
        uniqueReference: await this.generateUniqueReference(),
        ...logistics,
      },
    });
  }

  private async generateUniqueReference(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `FSF-${year}-${String(randomInt(0, 999_999)).padStart(6, '0')}`;
      const exists = await this.prisma.accreditationRequest.findUnique({
        where: { uniqueReference: candidate },
      });
      if (!exists) return candidate;
    }
    throw new DomainError(
      'REFERENCE_GENERATION_FAILED',
      'Impossible de generer une reference unique.',
      'CONFLICT',
    );
  }
}
