import { Inject, Injectable } from '@nestjs/common';
import type { MatchCategoryQuota, OverflowPolicy } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import {
  MATCHES_FACADE,
  type MatchesFacade,
} from '../competitions/competitions.facade.js';
import {
  ACCREDITATION_CONFIG_FACADE,
  type AccreditationConfigFacade,
} from '../accreditation-config/accreditation-config.facade.js';
import type { SetQuotaDto } from './dto/set-quota.dto.js';

export interface ReservationResult {
  reserved: boolean;
  overflowPolicy: OverflowPolicy;
  quotaTotal: number;
  consumed: number;
}

@Injectable()
export class QuotasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MATCHES_FACADE) private readonly matches: MatchesFacade,
    @Inject(ACCREDITATION_CONFIG_FACADE)
    private readonly accreditationConfig: AccreditationConfigFacade,
  ) {}

  async setQuota(
    matchId: string,
    dto: SetQuotaDto,
  ): Promise<MatchCategoryQuota> {
    await this.matches.getMatch(matchId);
    await this.accreditationConfig.getCategory(dto.categoryId);
    for (const zoneId of dto.zoneIds) {
      await this.accreditationConfig.getZone(zoneId);
    }

    return this.prisma.$transaction(async (tx) => {
      const quota = await tx.matchCategoryQuota.upsert({
        where: { matchId_categoryId: { matchId, categoryId: dto.categoryId } },
        create: {
          matchId,
          categoryId: dto.categoryId,
          quotaTotal: dto.quotaTotal,
          overflowPolicy: dto.overflowPolicy,
        },
        update: {
          quotaTotal: dto.quotaTotal,
          overflowPolicy: dto.overflowPolicy,
        },
      });
      await tx.matchCategoryQuotaZone.deleteMany({
        where: { quotaId: quota.id },
      });
      if (dto.zoneIds.length > 0) {
        await tx.matchCategoryQuotaZone.createMany({
          data: dto.zoneIds.map((zoneId) => ({ quotaId: quota.id, zoneId })),
        });
      }
      return quota;
    });
  }

  listForMatch(matchId: string) {
    return this.prisma.matchCategoryQuota.findMany({
      where: { matchId },
      include: { category: true, zones: { include: { zone: true } } },
    });
  }

  private async getQuotaRow(
    matchId: string,
    categoryId: string,
  ): Promise<MatchCategoryQuota> {
    const quota = await this.prisma.matchCategoryQuota.findUnique({
      where: { matchId_categoryId: { matchId, categoryId } },
    });
    if (!quota) {
      throw new DomainError(
        'QUOTA_NOT_CONFIGURED',
        "Aucun quota n'est configure pour ce match et cette categorie.",
        'CONFLICT',
      );
    }
    return quota;
  }

  getZonesForQuota(quotaId: string) {
    return this.prisma.matchCategoryQuotaZone.findMany({
      where: { quotaId },
      include: { zone: true },
    });
  }

  /**
   * Reservation atomique d'une place (cahier §11, Annexe B "verrou
   * transactionnel"). Un `UPDATE ... WHERE consumed < quotaTotal` est
   * atomique au niveau PostgreSQL : deux validations concurrentes ne
   * peuvent jamais faire depasser `quotaTotal`, meme sous forte charge.
   */
  async reserveSlot(
    matchId: string,
    categoryId: string,
  ): Promise<ReservationResult> {
    const quota = await this.getQuotaRow(matchId, categoryId);

    const updated = await this.prisma.matchCategoryQuota.updateMany({
      where: { id: quota.id, consumed: { lt: quota.quotaTotal } },
      data: { consumed: { increment: 1 } },
    });

    const fresh = await this.getQuotaRow(matchId, categoryId);
    return {
      reserved: updated.count === 1,
      overflowPolicy: fresh.overflowPolicy,
      quotaTotal: fresh.quotaTotal,
      consumed: fresh.consumed,
    };
  }

  /** Libere une place consommee (revocation/annulation post-validation). */
  async releaseSlot(matchId: string, categoryId: string): Promise<void> {
    const quota = await this.getQuotaRow(matchId, categoryId);
    if (quota.consumed <= 0) return;
    await this.prisma.matchCategoryQuota.update({
      where: { id: quota.id },
      data: { consumed: { decrement: 1 } },
    });
  }
}
