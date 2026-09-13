import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../../../shared/kernel/errors/error-catalog.js';
import {
  DOCUMENTS_FACADE,
  type DocumentsFacade,
} from '../../../documents/documents.facade.js';

/** Vue detaillee d'une demande : statut, complements, decisions, documents rattaches. */
@Injectable()
export class GetRequestQuery {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENTS_FACADE) private readonly documents: DocumentsFacade,
  ) {}

  async execute(requestId: string) {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: requestId },
      include: {
        match: true,
        categoryRequested: true,
        requester: { include: { media: true } },
        complements: { orderBy: { createdAt: 'desc' } },
        decisions: { orderBy: { createdAt: 'desc' } },
        accreditation: true,
      },
    });
    if (!request) {
      throw new DomainError(
        ErrorCodes.REQUEST_NOT_FOUND,
        'Demande introuvable.',
        'NOT_FOUND',
      );
    }
    const documents = await this.documents.listForSubject('REQUEST', requestId);
    return { ...request, documents };
  }
}
