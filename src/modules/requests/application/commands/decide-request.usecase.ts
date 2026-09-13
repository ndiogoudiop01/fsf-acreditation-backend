import { Inject, Injectable } from '@nestjs/common';
import {
  OverflowPolicy,
  RequestStatus,
  type AccreditationRequest,
} from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../../../shared/kernel/errors/error-catalog.js';
import {
  EVENT_BUS_PORT,
  type EventBusPort,
} from '../../../../shared/kernel/ports/event-bus.port.js';
import {
  QUOTAS_FACADE,
  type QuotasFacade,
} from '../../../quotas/quotas.facade.js';
import {
  ACCREDITATIONS_FACADE,
  type AccreditationsFacade,
} from '../../../accreditations/accreditations.facade.js';
import { assertTransitionAllowed } from '../../domain/request-status.machine.js';
import { RequestDecidedEvent } from '../../events/request.events.js';

export interface DecideRequestInput {
  requestId: string;
  actorId: string;
  actorIsAdmin: boolean;
  status: typeof RequestStatus.VALIDATED | typeof RequestStatus.REJECTED;
  reason?: string;
  zoneIds?: string[];
  overrideQuota?: boolean;
  assignedBoothNumber?: number;
  assignedFlashSlot?: string;
}

/**
 * Validation ou refus (cahier §13 etape 7, §14). La validation reserve
 * atomiquement une place de quota (module `quotas`) — cf. Annexe B "verrou
 * transactionnel". Politique de depassement geree explicitement :
 *  - QUEUE / MANUAL_ARBITRATION / CLOSE : la validation echoue avec
 *    QUOTA_EXCEEDED tant que le quota est plein ; une vraie file d'attente
 *    automatique est une amelioration Phase 2 (cf. docs/07).
 *  - PRIORITY : un administrateur peut forcer via `overrideQuota`.
 */
@Injectable()
export class DecideRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUOTAS_FACADE) private readonly quotas: QuotasFacade,
    @Inject(ACCREDITATIONS_FACADE)
    private readonly accreditations: AccreditationsFacade,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: DecideRequestInput): Promise<AccreditationRequest> {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) {
      throw new DomainError(
        ErrorCodes.REQUEST_NOT_FOUND,
        'Demande introuvable.',
        'NOT_FOUND',
      );
    }
    assertTransitionAllowed(request.status, input.status);

    if (input.status === RequestStatus.VALIDATED) {
      await this.reserveQuotaOrThrow(request, input);
    }

    let updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.accreditationRequest.update({
        where: { id: request.id },
        data: {
          status: input.status,
          decisionAt: new Date(),
          decisionById: input.actorId,
          decisionReason: input.reason,
        },
      });
      await tx.requestDecision.create({
        data: {
          requestId: request.id,
          actorId: input.actorId,
          fromStatus: request.status,
          toStatus: input.status,
          reason: input.reason,
        },
      });
      return result;
    });

    this.eventBus.publish(
      new RequestDecidedEvent(
        request.id,
        request.requesterId,
        input.status,
        input.reason,
        input.zoneIds ?? [],
      ),
    );

    // Genere immediatement le badge (cahier §13 etapes 8-9 : attribution puis
    // generation) : la demande passe VALIDEE -> BADGE_GENERATED des que le
    // badge existe, jamais avant (pas de badge orphelin en cas d'echec).
    if (input.status === RequestStatus.VALIDATED) {
      await this.accreditations.generateAccreditation(
        request.id,
        input.zoneIds ?? [],
        {
          assignedBoothNumber: input.assignedBoothNumber,
          assignedFlashSlot: input.assignedFlashSlot,
        },
      );
      updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.accreditationRequest.update({
          where: { id: request.id },
          data: { status: RequestStatus.BADGE_GENERATED },
        });
        await tx.requestDecision.create({
          data: {
            requestId: request.id,
            actorId: input.actorId,
            fromStatus: RequestStatus.VALIDATED,
            toStatus: RequestStatus.BADGE_GENERATED,
          },
        });
        return result;
      });
    }

    return updated;
  }

  private async reserveQuotaOrThrow(
    request: AccreditationRequest,
    input: DecideRequestInput,
  ): Promise<void> {
    if (input.overrideQuota) {
      if (!input.actorIsAdmin) {
        throw new DomainError(
          ErrorCodes.FORBIDDEN_SCOPE,
          'Seul un administrateur peut forcer un depassement de quota.',
          'FORBIDDEN',
        );
      }
      return;
    }

    const reservation = await this.quotas.reserveSlot(
      request.matchId,
      request.categoryRequestedId,
    );
    if (reservation.reserved) return;

    if (reservation.overflowPolicy === OverflowPolicy.PRIORITY) {
      throw new DomainError(
        ErrorCodes.QUOTA_EXCEEDED,
        'Quota atteint. Un administrateur peut forcer la validation (politique PRIORITY).',
        'QUOTA_EXCEEDED',
        { quotaTotal: reservation.quotaTotal, consumed: reservation.consumed },
      );
    }
    throw new DomainError(
      ErrorCodes.QUOTA_EXCEEDED,
      'Quota atteint pour cette categorie sur ce match.',
      'QUOTA_EXCEEDED',
      {
        quotaTotal: reservation.quotaTotal,
        consumed: reservation.consumed,
        overflowPolicy: reservation.overflowPolicy,
      },
    );
  }
}
