import { Inject, Injectable } from '@nestjs/common';
import {
  AccreditationStatus,
  ScanResult,
  ScanSource,
  type ScanLog,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { TokenHasherService } from '../../infrastructure/security/token-hasher.service.js';
import {
  ACCREDITATIONS_FACADE,
  type AccreditationsFacade,
} from '../accreditations/accreditations.facade.js';
import type { VerifyScanDto } from './dto/verify-scan.dto.js';
import type { OfflineScanRecordDto } from './dto/sync-offline-scans.dto.js';

export interface ScanVerdict {
  result: ScanResult;
  reason?: string;
  accreditation?: {
    requesterName: string;
    mediaName: string;
    categoryLabel: string;
    zones: string[];
    expiresAt: string;
  };
}

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenHasher: TokenHasherService,
    @Inject(ACCREDITATIONS_FACADE)
    private readonly accreditations: AccreditationsFacade,
  ) {}

  /**
   * Verification en ligne (cahier §17) : identite, match, date, statut,
   * categorie, zone et utilisation precedente — au minimum. Chaque scan est
   * journalise quel que soit le verdict (traçabilite, cahier §24).
   */
  async verifyScan(
    dto: VerifyScanDto,
    scannedById: string,
  ): Promise<ScanVerdict> {
    const accreditation = await this.accreditations.findByRawToken(dto.token);

    if (!accreditation) {
      await this.logScan({
        accreditationId: null,
        scannedTokenHash: this.tokenHasher.hash(dto.token),
        matchId: dto.matchId,
        zoneId: dto.zoneId,
        deviceId: dto.deviceId,
        gate: dto.gate,
        scannedById,
        result: ScanResult.INVALID,
        reason: 'Jeton inconnu',
      });
      return { result: ScanResult.INVALID, reason: 'Jeton inconnu' };
    }

    const detail = await this.prisma.accreditation.findUniqueOrThrow({
      where: { id: accreditation.id },
      include: {
        zones: { include: { zone: true } },
        request: {
          include: {
            match: true,
            categoryRequested: true,
            requester: { include: { media: true } },
          },
        },
      },
    });

    let verdict = this.evaluate(detail, dto);
    if (
      verdict.result === ScanResult.VALID &&
      (await this.wasAlreadyUsed(detail.id, dto.zoneId))
    ) {
      verdict = {
        result: ScanResult.ALREADY_USED,
        reason: 'Cette accreditation a deja ete utilisee pour cette zone',
      };
    }

    await this.logScan({
      accreditationId: detail.id,
      scannedTokenHash: this.tokenHasher.hash(dto.token),
      matchId: dto.matchId,
      zoneId: dto.zoneId,
      deviceId: dto.deviceId,
      gate: dto.gate,
      scannedById,
      result: verdict.result,
      reason: verdict.reason,
    });

    if (verdict.result === ScanResult.VALID) {
      return {
        ...verdict,
        accreditation: {
          requesterName: `${detail.request.requester.firstName} ${detail.request.requester.lastName}`,
          mediaName: detail.request.requester.media.name,
          categoryLabel: detail.request.categoryRequested.label,
          zones: detail.zones.map((z) => z.zone.label),
          expiresAt: detail.expiresAt.toISOString(),
        },
      };
    }
    return verdict;
  }

  private evaluate(
    detail: Awaited<
      ReturnType<PrismaService['accreditation']['findUniqueOrThrow']>
    > & {
      zones: { zoneId: string }[];
      request: { matchId: string };
    },
    dto: VerifyScanDto,
  ): ScanVerdict {
    if (detail.status === AccreditationStatus.REVOKED) {
      return {
        result: ScanResult.REVOKED,
        reason: detail.revocationReason ?? 'Accreditation revoquee',
      };
    }
    if (
      detail.status === AccreditationStatus.EXPIRED ||
      detail.expiresAt < new Date()
    ) {
      return { result: ScanResult.EXPIRED, reason: 'Accreditation expiree' };
    }
    if (detail.request.matchId !== dto.matchId) {
      return {
        result: ScanResult.OUT_OF_SCOPE,
        reason: 'Cette accreditation ne concerne pas ce match',
      };
    }
    if (dto.zoneId && !detail.zones.some((z) => z.zoneId === dto.zoneId)) {
      return {
        result: ScanResult.OUT_OF_SCOPE,
        reason: 'Cette accreditation ne couvre pas cette zone',
      };
    }
    return { result: ScanResult.VALID };
  }

  /** "Deja utilise" est evalue par zone : un badge multi-zones reste valide sur une zone non encore utilisee. */
  private async wasAlreadyUsed(
    accreditationId: string,
    zoneId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.scanLog.count({
      where: {
        accreditationId,
        zoneId: zoneId ?? null,
        result: ScanResult.VALID,
      },
    });
    return count > 0;
  }

  async listForMatch(matchId: string): Promise<ScanLog[]> {
    return this.prisma.scanLog.findMany({
      where: { matchId },
      orderBy: { scannedAt: 'desc' },
      take: 200,
    });
  }

  /** Export pour appareil de controle hors-connexion (cahier §18, contrat Phase 1). */
  async exportForOfflineUse(matchId: string) {
    const accreditations = await this.prisma.accreditation.findMany({
      where: { status: AccreditationStatus.ACTIVE, request: { matchId } },
      include: { zones: true },
    });
    return accreditations.map((a) => ({
      accreditationId: a.id,
      qrTokenHash: a.qrTokenHash,
      expiresAt: a.expiresAt,
      zoneIds: a.zones.map((z) => z.zoneId),
    }));
  }

  /** Ingestion idempotente des scans effectues hors-connexion (cahier §18). */
  async syncOfflineScans(
    scans: OfflineScanRecordDto[],
    scannedById: string,
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;
    for (const scan of scans) {
      const existing = await this.prisma.scanLog.findFirst({
        where: {
          accreditationId: scan.accreditationId,
          deviceId: scan.deviceId,
          scannedAt: new Date(scan.scannedAt),
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      const accreditation = await this.prisma.accreditation.findUnique({
        where: { id: scan.accreditationId },
      });
      await this.prisma.scanLog.create({
        data: {
          accreditationId: scan.accreditationId,
          scannedTokenHash: accreditation?.qrTokenHash ?? 'unknown',
          matchId: scan.matchId,
          zoneId: scan.zoneId,
          deviceId: scan.deviceId,
          gate: scan.gate,
          scannedById,
          result: scan.result,
          source: ScanSource.OFFLINE_SYNCED,
          scannedAt: new Date(scan.scannedAt),
          syncedAt: new Date(),
        },
      });
      inserted += 1;
    }
    return { inserted, skipped };
  }

  private async logScan(input: {
    accreditationId: string | null;
    scannedTokenHash: string;
    matchId: string;
    zoneId?: string;
    deviceId: string;
    gate?: string;
    scannedById: string;
    result: ScanResult;
    reason?: string;
  }): Promise<void> {
    await this.prisma.scanLog.create({
      data: {
        accreditationId: input.accreditationId,
        scannedTokenHash: input.scannedTokenHash,
        matchId: input.matchId,
        zoneId: input.zoneId,
        deviceId: input.deviceId,
        gate: input.gate,
        scannedById: input.scannedById,
        result: input.result,
        reason: input.reason,
        source: ScanSource.ONLINE,
        scannedAt: new Date(),
      },
    });
  }
}
