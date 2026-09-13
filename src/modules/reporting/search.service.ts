import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { TokenHasherService } from '../../infrastructure/security/token-hasher.service.js';

/**
 * Recherche transverse (cahier §25) : demandeur, media, accreditation,
 * match, reference unique ou jeton QR. Reservee au staff (permissions
 * verifiees au niveau du controleur), expose uniquement les champs
 * necessaires pour retrouver la fiche.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenHasher: TokenHasherService,
  ) {}

  async search(term: string) {
    const [
      requesters,
      media,
      requests,
      accreditationByNumber,
      accreditationByToken,
    ] = await Promise.all([
      this.prisma.requesterProfile.findMany({
        where: {
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, firstName: true, lastName: true, mediaId: true },
      }),
      this.prisma.media.findMany({
        where: { name: { contains: term, mode: 'insensitive' } },
        take: 10,
        select: { id: true, name: true, type: true },
      }),
      this.prisma.accreditationRequest.findMany({
        where: { uniqueReference: { contains: term, mode: 'insensitive' } },
        take: 10,
        select: {
          id: true,
          uniqueReference: true,
          status: true,
          matchId: true,
        },
      }),
      this.prisma.accreditation.findMany({
        where: { number: { contains: term, mode: 'insensitive' } },
        take: 10,
        select: { id: true, number: true, status: true, requestId: true },
      }),
      this.prisma.accreditation.findUnique({
        where: { qrTokenHash: this.tokenHasher.hash(term) },
        select: { id: true, number: true, status: true, requestId: true },
      }),
    ]);

    return {
      requesters,
      media,
      requests,
      accreditations: [
        ...accreditationByNumber,
        ...(accreditationByToken ? [accreditationByToken] : []),
      ],
    };
  }
}
