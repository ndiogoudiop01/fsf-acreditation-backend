import { Injectable } from '@nestjs/common';
import type { AccreditationRequest } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import {
  buildPageResult,
  toSkipTake,
  type PageResult,
} from '../../../../shared/kernel/application/pagination.js';
import type { ListRequestsDto } from '../../dto/list-requests.dto.js';

/** Recherche multi-criteres pour le back-office (cahier §25). */
@Injectable()
export class ListRequestsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: ListRequestsDto,
    requesterId?: string,
  ): Promise<PageResult<AccreditationRequest>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(requesterId ? { requesterId } : {}),
      ...(query.matchId ? { matchId: query.matchId } : {}),
      ...(query.categoryRequestedId
        ? { categoryRequestedId: query.categoryRequestedId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.accreditationRequest.findMany({
        where,
        include: {
          match: true,
          categoryRequested: true,
          requester: { include: { media: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page),
      }),
      this.prisma.accreditationRequest.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }
}
