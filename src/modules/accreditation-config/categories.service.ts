import { Injectable } from '@nestjs/common';
import type { AccreditationCategory } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<AccreditationCategory> {
    const existing = await this.prisma.accreditationCategory.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new DomainError(
        'CATEGORY_CODE_TAKEN',
        `Le code "${dto.code}" est deja utilise.`,
        'CONFLICT',
      );
    }
    return this.prisma.accreditationCategory.create({
      data: { ...dto, requiredDocumentTypes: dto.requiredDocumentTypes ?? [] },
    });
  }

  async get(id: string): Promise<AccreditationCategory> {
    const category = await this.prisma.accreditationCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new DomainError(
        'CATEGORY_NOT_FOUND',
        'Categorie introuvable.',
        'NOT_FOUND',
      );
    }
    return category;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<AccreditationCategory> {
    await this.get(id);
    return this.prisma.accreditationCategory.update({
      where: { id },
      data: dto,
    });
  }

  list(activeOnly = false): Promise<AccreditationCategory[]> {
    return this.prisma.accreditationCategory.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { label: 'asc' },
    });
  }
}
