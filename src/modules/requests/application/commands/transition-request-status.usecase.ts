import { Injectable } from '@nestjs/common';
import { RequestStatus, type AccreditationRequest } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../../../shared/kernel/errors/error-catalog.js';
import { assertTransitionAllowed } from '../../domain/request-status.machine.js';

export interface TransitionRequestStatusInput {
  requestId: string;
  toStatus: RequestStatus;
  actorId: string;
  reason?: string;
}

/**
 * Transition generique pour les etapes sans effet de bord specifique (ex:
 * UNDER_REVIEW -> COMPLETE, cahier §13 etape 6). Les transitions avec effet
 * de bord (quota, evenement metier) ont leur propre use case dedie.
 */
@Injectable()
export class TransitionRequestStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: TransitionRequestStatusInput,
  ): Promise<AccreditationRequest> {
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
    assertTransitionAllowed(request.status, input.toStatus);

    const [updated] = await this.prisma.$transaction([
      this.prisma.accreditationRequest.update({
        where: { id: input.requestId },
        data: { status: input.toStatus },
      }),
      this.prisma.requestDecision.create({
        data: {
          requestId: input.requestId,
          actorId: input.actorId,
          fromStatus: request.status,
          toStatus: input.toStatus,
          reason: input.reason,
        },
      }),
    ]);
    return updated;
  }
}
