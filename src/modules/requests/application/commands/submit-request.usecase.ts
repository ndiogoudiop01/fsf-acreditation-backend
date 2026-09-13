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
  MATCHES_FACADE,
  type MatchesFacade,
} from '../../../competitions/competitions.facade.js';
import { assertTransitionAllowed } from '../../domain/request-status.machine.js';
import { RequestSubmittedEvent } from '../../events/request.events.js';

export interface SubmitRequestInput {
  requestId: string;
  /** Id du profil demandeur (RequesterProfile), pour verifier la propriete du dossier. */
  requesterId: string;
  /** Id de l'utilisateur (User) authentifie, pour la journalisation de la decision. */
  actorUserId: string;
}

/**
 * Soumission (cahier §9, §13, statuts 1->2) : verifie la periode d'ouverture
 * du match, detecte les doublons probables (meme demandeur, meme match, une
 * autre demande deja active) sans bloquer — "dedoublonnage supervise"
 * (Annexe B) plutot qu'un rejet automatique.
 */
@Injectable()
export class SubmitRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MATCHES_FACADE) private readonly matches: MatchesFacade,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  async execute(input: SubmitRequestInput): Promise<AccreditationRequest> {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request || request.requesterId !== input.requesterId) {
      throw new DomainError(
        ErrorCodes.REQUEST_NOT_FOUND,
        'Demande introuvable.',
        'NOT_FOUND',
      );
    }
    assertTransitionAllowed(request.status, RequestStatus.SUBMITTED);

    const match = await this.matches.getMatch(request.matchId);
    this.matches.assertAcceptingRequests(match);

    const duplicate = await this.prisma.accreditationRequest.findFirst({
      where: {
        requesterId: request.requesterId,
        matchId: request.matchId,
        id: { not: request.id },
        status: { notIn: [RequestStatus.REJECTED, RequestStatus.CANCELLED] },
      },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.accreditationRequest.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.SUBMITTED,
          submittedAt: new Date(),
          duplicateOfId: duplicate?.id,
        },
      });
      await tx.requestDecision.create({
        data: {
          requestId: request.id,
          actorId: input.actorUserId,
          fromStatus: request.status,
          toStatus: RequestStatus.SUBMITTED,
        },
      });
      return result;
    });

    this.eventBus.publish(
      new RequestSubmittedEvent(request.id, request.requesterId),
    );
    return updated;
  }
}
