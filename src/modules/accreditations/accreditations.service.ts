import { Inject, Injectable } from '@nestjs/common';
import { AccreditationStatus, type Accreditation } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { TokenHasherService } from '../../infrastructure/security/token-hasher.service.js';
import { EcdsaSignerService } from '../../infrastructure/security/ecdsa-signer.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import {
  EVENT_BUS_PORT,
  type EventBusPort,
} from '../../shared/kernel/ports/event-bus.port.js';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../shared/kernel/ports/storage.port.js';
import {
  AccreditationGeneratedEvent,
  AccreditationRevokedEvent,
} from './events/accreditation.events.js';
import { BadgeRendererService } from './badge-renderer.service.js';

const DEFAULT_VALIDITY_DAYS = 1;

export interface GenerateAccreditationOptions {
  assignedBoothNumber?: number;
  assignedFlashSlot?: string;
}

export interface AssignmentInput {
  assignedBoothNumber?: number | null;
  assignedFlashSlot?: string | null;
}

@Injectable()
export class AccreditationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenHasher: TokenHasherService,
    private readonly ecdsaSigner: EcdsaSignerService,
    private readonly badgeRenderer: BadgeRendererService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Genere le badge + QR Code pour une demande VALIDEE (cahier §16, §17).
   * Le jeton opaque n'existe en clair que le temps de cette fonction : seul
   * son hash HMAC est persiste, le PNG du QR encode directement le jeton.
   * Le badge est en outre signe (ECDSA P-256) pour permettre une
   * verification d'integrite hors-ligne aux postes de controle (cahier §18).
   */
  async generateAccreditation(
    requestId: string,
    zoneIds: string[],
    options: GenerateAccreditationOptions = {},
  ): Promise<Accreditation> {
    const request = await this.prisma.accreditationRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { include: { media: true, user: true } },
        match: true,
        categoryRequested: true,
      },
    });
    if (!request) {
      throw new DomainError(
        ErrorCodes.REQUEST_NOT_FOUND,
        'Demande introuvable.',
        'NOT_FOUND',
      );
    }

    const rawToken = this.tokenHasher.generateOpaqueToken();
    const qrTokenHash = this.tokenHasher.hash(rawToken);
    const number = await this.generateBadgeNumber();
    const issuedAt = new Date();
    const expiresAt = new Date(
      request.match.kickoffAt.getTime() + DEFAULT_VALIDITY_DAYS * 86_400_000,
    );

    const signature = this.ecdsaSigner.sign({
      accreditationId: requestId,
      number,
      reference: request.uniqueReference,
      firstName: request.requester.firstName,
      lastName: request.requester.lastName,
      mediaName: request.requester.media.name,
      matchId: request.matchId,
      zoneIds,
      boothNumber: options.assignedBoothNumber ?? null,
      flashSlot: options.assignedFlashSlot ?? null,
      issuedAt: Math.floor(issuedAt.getTime() / 1000),
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
    });
    const cryptoSignature = {
      payloadVersion: 'FSF-CRYPTO-V1-ECDSA-P256',
      rawPayload: signature.rawPayload,
      ecdsaSignatureHex: signature.ecdsaSignatureHex,
      publicKeyFingerprint: signature.publicKeyFingerprint,
      issuedTimestamp: Math.floor(issuedAt.getTime() / 1000),
      expiresTimestamp: Math.floor(expiresAt.getTime() / 1000),
      offlineChecksum: signature.offlineChecksum,
    };

    const accreditation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.accreditation.create({
        data: {
          requestId,
          number,
          status: AccreditationStatus.ACTIVE,
          qrTokenHash,
          issuedAt,
          expiresAt,
          assignedBoothNumber: options.assignedBoothNumber,
          assignedFlashSlot: options.assignedFlashSlot,
          cryptoSignature,
        },
      });
      if (zoneIds.length > 0) {
        await tx.accreditationZone.createMany({
          data: zoneIds.map((zoneId) => ({
            accreditationId: created.id,
            zoneId,
          })),
        });
      }
      return created;
    });

    const qrPng = await this.badgeRenderer.renderQrCode(rawToken);
    const zones = await this.prisma.zone.findMany({
      where: { id: { in: zoneIds } },
    });
    const badgePdf = await this.badgeRenderer.renderBadgePdf(
      {
        number,
        requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
        mediaName: request.requester.media.name,
        function: request.requester.function,
        categoryLabel: request.categoryRequested.label,
        matchLabel: `${request.match.homeTeam} vs ${request.match.awayTeam}`,
        matchDate: request.match.kickoffAt.toISOString(),
        stadium: request.match.stadium,
        zoneLabels: zones.map((z) => z.label),
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      qrPng,
    );
    await Promise.all([
      this.storage.putObject({
        key: `accreditations/${accreditation.id}/badge.pdf`,
        body: badgePdf,
        contentType: 'application/pdf',
      }),
      // Stocke aussi le QR seul (PNG) pour affichage web — le jeton en clair
      // n'est jamais reconserve au-dela de cette fonction.
      this.storage.putObject({
        key: `accreditations/${accreditation.id}/qr.png`,
        body: qrPng,
        contentType: 'image/png',
      }),
    ]);

    this.eventBus.publish(
      new AccreditationGeneratedEvent(
        accreditation.id,
        requestId,
        request.requesterId,
      ),
    );
    return accreditation;
  }

  async getForRequest(requestId: string, expectedRequesterId?: string) {
    const accreditation = await this.prisma.accreditation.findUnique({
      where: { requestId },
      include: {
        zones: { include: { zone: true } },
        request: { select: { requesterId: true } },
      },
    });
    if (!accreditation) {
      throw new DomainError(
        ErrorCodes.ACCREDITATION_NOT_FOUND,
        'Accreditation introuvable.',
        'NOT_FOUND',
      );
    }
    if (
      expectedRequesterId &&
      accreditation.request.requesterId !== expectedRequesterId
    ) {
      throw new DomainError(
        ErrorCodes.FORBIDDEN_SCOPE,
        'Ce badge ne vous appartient pas.',
        'FORBIDDEN',
      );
    }
    return accreditation;
  }

  getBadgeDownloadUrl(accreditationId: string): Promise<string> {
    return this.storage.getSignedDownloadUrl(
      `accreditations/${accreditationId}/badge.pdf`,
    );
  }

  getQrCodeUrl(accreditationId: string): Promise<string> {
    return this.storage.getSignedDownloadUrl(
      `accreditations/${accreditationId}/qr.png`,
    );
  }

  async updateAssignments(
    accreditationId: string,
    input: AssignmentInput,
  ): Promise<Accreditation> {
    const accreditation = await this.prisma.accreditation.findUnique({
      where: { id: accreditationId },
    });
    if (!accreditation) {
      throw new DomainError(
        ErrorCodes.ACCREDITATION_NOT_FOUND,
        'Accreditation introuvable.',
        'NOT_FOUND',
      );
    }
    return this.prisma.accreditation.update({
      where: { id: accreditationId },
      data: {
        assignedBoothNumber: input.assignedBoothNumber,
        assignedFlashSlot: input.assignedFlashSlot,
      },
    });
  }

  /** Retrouve une accreditation a partir du jeton brut scanne (cahier §17). */
  async findByRawToken(rawToken: string): Promise<Accreditation | null> {
    const qrTokenHash = this.tokenHasher.hash(rawToken);
    return this.prisma.accreditation.findUnique({
      where: { qrTokenHash },
      include: {
        zones: { include: { zone: true } },
        request: { include: { match: true } },
      },
    });
  }

  async revoke(
    accreditationId: string,
    reason: string,
    revokedById: string,
  ): Promise<Accreditation> {
    const accreditation = await this.prisma.accreditation.findUnique({
      where: { id: accreditationId },
    });
    if (!accreditation) {
      throw new DomainError(
        ErrorCodes.ACCREDITATION_NOT_FOUND,
        'Accreditation introuvable.',
        'NOT_FOUND',
      );
    }
    if (accreditation.status === AccreditationStatus.REVOKED) {
      throw new DomainError(
        ErrorCodes.ACCREDITATION_ALREADY_REVOKED,
        'Cette accreditation est deja revoquee.',
        'CONFLICT',
      );
    }
    const updated = await this.prisma.accreditation.update({
      where: { id: accreditationId },
      data: {
        status: AccreditationStatus.REVOKED,
        revokedAt: new Date(),
        revokedById,
        revocationReason: reason,
      },
    });
    this.eventBus.publish(
      new AccreditationRevokedEvent(
        accreditationId,
        accreditation.requestId,
        reason,
      ),
    );
    return updated;
  }

  private async generateBadgeNumber(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `ACC-${year}-${String(randomInt(0, 999_999)).padStart(6, '0')}`;
      const exists = await this.prisma.accreditation.findUnique({
        where: { number: candidate },
      });
      if (!exists) return candidate;
    }
    throw new DomainError(
      'BADGE_NUMBER_GENERATION_FAILED',
      'Impossible de generer un numero de badge unique.',
      'CONFLICT',
    );
  }
}
