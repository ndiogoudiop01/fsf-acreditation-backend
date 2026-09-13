import { Injectable } from '@nestjs/common';
import type { Zone } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import type { CreateZoneDto } from './dto/create-zone.dto.js';
import type { UpdateZoneDto } from './dto/update-zone.dto.js';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZoneDto): Promise<Zone> {
    const existing = await this.prisma.zone.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new DomainError(
        'ZONE_CODE_TAKEN',
        `Le code "${dto.code}" est deja utilise.`,
        'CONFLICT',
      );
    }
    return this.prisma.zone.create({ data: dto });
  }

  async get(id: string): Promise<Zone> {
    const zone = await this.prisma.zone.findUnique({ where: { id } });
    if (!zone) {
      throw new DomainError('ZONE_NOT_FOUND', 'Zone introuvable.', 'NOT_FOUND');
    }
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto): Promise<Zone> {
    await this.get(id);
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  list(activeOnly = false): Promise<Zone[]> {
    return this.prisma.zone.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { label: 'asc' },
    });
  }
}
