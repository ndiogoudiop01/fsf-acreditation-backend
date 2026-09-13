import { Injectable } from '@nestjs/common';
import { RequestStatus, type RequestComplement } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';

export interface ResolveComplementInput {
  requestId: string;
  complementId: string;
  requesterId: string;
}

/**
 * Le demandeur signale qu'il a fourni l'element manquant (cahier §15 :
 * "toute nouvelle version sera historisee et le dossier retournera
 * automatiquement dans la file de traitement"). Des que plus aucun
 * complement n'est ouvert, la demande repasse en UNDER_REVIEW.
 */
@Injectable()
export class ResolveComplementUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ResolveComplementInput): Promise<RequestComplement> {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request || request.requesterId !== input.requesterId) {
      throw new DomainError(
        'REQUEST_NOT_FOUND',
        'Demande introuvable.',
        'NOT_FOUND',
      );
    }
    const complement = await this.prisma.requestComplement.findUnique({
      where: { id: input.complementId },
    });
    if (!complement || complement.requestId !== input.requestId) {
      throw new DomainError(
        'COMPLEMENT_NOT_FOUND',
        'Demande de complement introuvable.',
        'NOT_FOUND',
      );
    }

    const [resolved] = await this.prisma.$transaction([
      this.prisma.requestComplement.update({
        where: { id: input.complementId },
        data: { resolvedAt: new Date() },
      }),
    ]);

    const remainingOpen = await this.prisma.requestComplement.count({
      where: { requestId: input.requestId, resolvedAt: null },
    });
    if (
      remainingOpen === 0 &&
      request.status === RequestStatus.INFO_REQUESTED
    ) {
      await this.prisma.accreditationRequest.update({
        where: { id: input.requestId },
        data: { status: RequestStatus.UNDER_REVIEW },
      });
    }

    return resolved;
  }
}
