import { Inject, Injectable } from '@nestjs/common';
import { RequestStatus, type RequestComplement } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../../../shared/kernel/errors/error-catalog.js';
import {
  EVENT_BUS_PORT,
  type EventBusPort,
} from '../../../../shared/kernel/ports/event-bus.port.js';
import { assertTransitionAllowed } from '../../domain/request-status.machine.js';
import { RequestComplementRequestedEvent } from '../../events/request.events.js';

export interface RequestComplementInput {
  requestId: string;
  requestedById: string;
  missingItem: string;
  comment?: string;
  dueDate?: string;
}

/** Demande de complement (cahier §15) : UNDER_REVIEW -> INFO_REQUESTED. */
@Injectable()
export class RequestComplementUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: RequestComplementInput): Promise<RequestComplement> {
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
    assertTransitionAllowed(request.status, RequestStatus.INFO_REQUESTED);

    const [complement] = await this.prisma.$transaction([
      this.prisma.requestComplement.create({
        data: {
          requestId: input.requestId,
          requestedById: input.requestedById,
          missingItem: input.missingItem,
          comment: input.comment,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
      }),
      this.prisma.accreditationRequest.update({
        where: { id: input.requestId },
        data: { status: RequestStatus.INFO_REQUESTED },
      }),
      this.prisma.requestDecision.create({
        data: {
          requestId: input.requestId,
          actorId: input.requestedById,
          fromStatus: request.status,
          toStatus: RequestStatus.INFO_REQUESTED,
          reason: input.missingItem,
        },
      }),
    ]);

    this.eventBus.publish(
      new RequestComplementRequestedEvent(
        input.requestId,
        request.requesterId,
        input.missingItem,
      ),
    );
    return complement;
  }
}
