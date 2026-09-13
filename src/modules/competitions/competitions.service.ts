import { Injectable } from '@nestjs/common';
import type { Competition } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import {
  buildPageResult,
  toSkipTake,
  type PageResult,
} from '../../shared/kernel/application/pagination.js';
import type { CreateCompetitionDto } from './dto/create-competition.dto.js';
import type { UpdateCompetitionDto } from './dto/update-competition.dto.js';
import type { ListCompetitionsDto } from './dto/list-competitions.dto.js';

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCompetitionDto): Promise<Competition> {
    return this.prisma.competition.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async get(id: string): Promise<Competition> {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });
    if (!competition) {
      throw new DomainError(
        'COMPETITION_NOT_FOUND',
        'Competition introuvable.',
        'NOT_FOUND',
      );
    }
    return competition;
  }

  async update(id: string, dto: UpdateCompetitionDto): Promise<Competition> {
    await this.get(id);
    return this.prisma.competition.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async list(query: ListCompetitionsDto): Promise<PageResult<Competition>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.competition.findMany({
        where,
        orderBy: { startDate: 'desc' },
        ...toSkipTake(page),
      }),
      this.prisma.competition.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }
}
