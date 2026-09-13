import { Injectable } from '@nestjs/common';
import {
  AccreditationStatus,
  RequestStatus,
  ScanResult,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import type { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

export const PENDING_STATUSES: RequestStatus[] = [
  RequestStatus.SUBMITTED,
  RequestStatus.UNDER_REVIEW,
  RequestStatus.COMPLETE,
  RequestStatus.PENDING_VALIDATION,
];
const VALIDATED_STATUSES: RequestStatus[] = [
  RequestStatus.VALIDATED,
  RequestStatus.BADGE_GENERATED,
  RequestStatus.ACCESS_USED,
];

/** Indicateurs de pilotage (cahier §21). Lecture transverse assumee (cf. docs/03). */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStats(filter: DashboardFilterDto) {
    const where: Prisma.AccreditationRequestWhereInput = {
      ...(filter.matchId ? { matchId: filter.matchId } : {}),
      ...(filter.categoryId ? { categoryRequestedId: filter.categoryId } : {}),
      ...(filter.competitionId
        ? { match: { competitionId: filter.competitionId } }
        : {}),
      ...(filter.mediaId ? { requester: { mediaId: filter.mediaId } } : {}),
    };

    const [
      total,
      pending,
      validated,
      rejected,
      incomplete,
      badgesGenerated,
      badgesUsed,
      mediaCount,
      requesterCount,
    ] = await Promise.all([
      this.prisma.accreditationRequest.count({ where }),
      this.prisma.accreditationRequest.count({
        where: { ...where, status: { in: PENDING_STATUSES } },
      }),
      this.prisma.accreditationRequest.count({
        where: { ...where, status: { in: VALIDATED_STATUSES } },
      }),
      this.prisma.accreditationRequest.count({
        where: { ...where, status: RequestStatus.REJECTED },
      }),
      this.prisma.accreditationRequest.count({
        where: { ...where, status: RequestStatus.INFO_REQUESTED },
      }),
      this.prisma.accreditation.count({ where: { request: where } }),
      this.prisma.accreditation.count({
        where: {
          request: where,
          scans: { some: { result: ScanResult.VALID } },
        },
      }),
      this.prisma.media.count(),
      this.prisma.requesterProfile.count(),
    ]);

    return {
      requests: { total, pending, validated, rejected, incomplete },
      accreditations: { generated: badgesGenerated, used: badgesUsed },
      referentials: { media: mediaCount, requesters: requesterCount },
      completionRate:
        total > 0 ? Number(((validated / total) * 100).toFixed(1)) : 0,
      computedAt: new Date().toISOString(),
    };
  }

  /** Tableau de bord jour de match (cahier §22). */
  async getMatchDayStats(matchId: string) {
    const [accredited, scans, zoneBreakdown, lastScans, activeDevices] =
      await Promise.all([
        this.prisma.accreditation.count({
          where: { request: { matchId }, status: AccreditationStatus.ACTIVE },
        }),
        this.prisma.scanLog.groupBy({
          by: ['result'],
          where: { matchId },
          _count: true,
        }),
        this.prisma.scanLog.groupBy({
          by: ['zoneId'],
          where: { matchId, result: ScanResult.VALID },
          _count: true,
        }),
        this.prisma.scanLog.findMany({
          where: { matchId },
          orderBy: { scannedAt: 'desc' },
          take: 20,
        }),
        this.prisma.scanLog.findMany({
          where: { matchId },
          distinct: ['deviceId'],
          select: { deviceId: true },
        }),
      ]);

    const scansByResult = Object.fromEntries(
      scans.map((s) => [s.result, s._count]),
    );
    return {
      matchId,
      accredited,
      entries: scansByResult[ScanResult.VALID] ?? 0,
      refusals: Object.entries(scansByResult)
        .filter(([result]) => result !== ScanResult.VALID)
        .reduce((sum, [, count]) => sum + count, 0),
      scansByResult,
      zoneBreakdown: zoneBreakdown.map((z) => ({
        zoneId: z.zoneId,
        count: z._count,
      })),
      lastScans,
      activeDevices: activeDevices.length,
      computedAt: new Date().toISOString(),
    };
  }
}
