import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../../../shared/kernel/errors/error-catalog.js';

export interface TrackRequestResult {
  uniqueReference: string;
  status: string;
  match: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: Date;
    stadium: string;
  };
  category: string;
  submittedAt: Date | null;
  decisionAt: Date | null;
  decisionReason: string | null;
  hasAccreditation: boolean;
}

/**
 * Suivi public (cahier §9) : recherche par numero de dossier, confirmee par
 * l'email du compte demandeur — evite l'enumeration de dossiers par simple
 * essai de references. Ne renvoie aucune donnee personnelle au-dela du
 * strict necessaire pour afficher un statut.
 */
@Injectable()
export class TrackRequestQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(reference: string, email: string): Promise<TrackRequestResult> {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { uniqueReference: reference },
      include: {
        match: true,
        categoryRequested: true,
        requester: { include: { user: true } },
        accreditation: true,
      },
    });

    if (
      !request ||
      request.requester.user.email.toLowerCase() !== email.toLowerCase()
    ) {
      throw new DomainError(
        ErrorCodes.REQUEST_NOT_FOUND,
        'Aucun dossier ne correspond a ces informations.',
        'NOT_FOUND',
      );
    }

    return {
      uniqueReference: request.uniqueReference,
      status: request.status,
      match: {
        homeTeam: request.match.homeTeam,
        awayTeam: request.match.awayTeam,
        kickoffAt: request.match.kickoffAt,
        stadium: request.match.stadium,
      },
      category: request.categoryRequested.label,
      submittedAt: request.submittedAt,
      decisionAt: request.decisionAt,
      decisionReason:
        request.status === 'REJECTED' ? request.decisionReason : null,
      hasAccreditation: Boolean(request.accreditation),
    };
  }
}
