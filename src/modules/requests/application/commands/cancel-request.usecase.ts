import { Inject, Injectable } from '@nestjs/common';
import { RequestStatus, type AccreditationRequest } from '@prisma/client';
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
import { assertTransitionAllowed } from '../../domain/request-status.machine.js';
import { RequestCancelledEvent } from '../../events/request.events.js';

export interface CancelRequestInput {
  requestId: string;
  actorId: string;
  /** Verifie la propriete quand appele par un demandeur (omis pour un staff). */
  requesterId?: string;
}

@Injectable()
export class CancelRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUOTAS_FACADE) private readonly quotas: QuotasFacade,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: CancelRequestInput): Promise<AccreditationRequest> {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (
      !request ||
      (input.requesterId && request.requesterId !== input.requesterId)
    ) {
      throw new DomainError(
        ErrorCodes.REQUEST_NOT_FOUND,
        'Demande introuvable.',
        'NOT_FOUND',
      );
    }
    assertTransitionAllowed(request.status, RequestStatus.CANCELLED);

    const previousStatus = request.status;
    const statusesWithReservedQuota: RequestStatus[] = [
      RequestStatus.VALIDATED,
      RequestStatus.BADGE_GENERATED,
      RequestStatus.ACCESS_USED,
    ];
    const shouldReleaseQuota =
      statusesWithReservedQuota.includes(previousStatus);

    const [updated] = await this.prisma.$transaction([
      this.prisma.accreditationRequest.update({
        where: { id: request.id },
        data: { status: RequestStatus.CANCELLED },
      }),
      this.prisma.requestDecision.create({
        data: {
          requestId: request.id,
          actorId: input.actorId,
          fromStatus: previousStatus,
          toStatus: RequestStatus.CANCELLED,
        },
      }),
    ]);

    if (shouldReleaseQuota) {
      await this.quotas.releaseSlot(
        request.matchId,
        request.categoryRequestedId,
      );
    }
    this.eventBus.publish(
      new RequestCancelledEvent(request.id, previousStatus),
    );
    return updated;
  }
}
