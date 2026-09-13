import { Injectable } from '@nestjs/common';
import {
  RequesterStatus,
  type Media,
  type RequesterProfile,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import {
  buildPageResult,
  toSkipTake,
  type PageResult,
} from '../../shared/kernel/application/pagination.js';
import type { CreateMediaDto } from './dto/create-media.dto.js';
import type { UpdateMediaDto } from './dto/update-media.dto.js';
import type { ListMediaDto } from './dto/list-media.dto.js';
import type { CreateRequesterProfileDto } from './dto/create-requester-profile.dto.js';
import type { ListRequesterProfilesDto } from './dto/list-requester-profiles.dto.js';

/**
 * Referentiel medias + profils demandeurs (cahier §7, §8). Module "style
 * referentiel" (cf. docs/03-modules-et-frontieres.md) : logique simple,
 * pas de couche domaine dediee.
 */
@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async createMedia(dto: CreateMediaDto): Promise<Media> {
    const duplicate = await this.prisma.media.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        country: dto.country,
      },
    });
    if (duplicate) {
      throw new DomainError(
        ErrorCodes.MEDIA_NOT_FOUND,
        `Un media nomme "${dto.name}" existe deja pour ce pays (dedoublonnage, cahier §7).`,
        'CONFLICT',
        { existingId: duplicate.id },
      );
    }
    return this.prisma.media.create({ data: dto });
  }

  async updateMedia(id: string, dto: UpdateMediaDto): Promise<Media> {
    await this.getMedia(id);
    return this.prisma.media.update({ where: { id }, data: dto });
  }

  async updateMediaStatus(id: string, status: Media['status']): Promise<Media> {
    await this.getMedia(id);
    return this.prisma.media.update({ where: { id }, data: { status } });
  }

  async getMedia(id: string): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new DomainError(
        ErrorCodes.MEDIA_NOT_FOUND,
        'Media introuvable.',
        'NOT_FOUND',
      );
    }
    return media;
  }

  async listMedia(query: ListMediaDto): Promise<PageResult<Media>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { name: 'asc' },
        ...toSkipTake(page),
      }),
      this.prisma.media.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }

  async createRequesterProfile(
    userId: string,
    dto: CreateRequesterProfileDto,
  ): Promise<RequesterProfile> {
    await this.getMedia(dto.mediaId);
    return this.prisma.requesterProfile.create({
      data: {
        userId,
        mediaId: dto.mediaId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        nationality: dto.nationality,
        phone: dto.phone,
        address: dto.address,
        function: dto.function,
        specialty: dto.specialty,
        pressCardNumber: dto.pressCardNumber,
        professionalPhone: dto.professionalPhone,
        professionalEmail: dto.professionalEmail,
      },
    });
  }

  async getRequesterProfile(id: string): Promise<RequesterProfile> {
    const profile = await this.prisma.requesterProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new DomainError(
        'REQUESTER_NOT_FOUND',
        'Profil demandeur introuvable.',
        'NOT_FOUND',
      );
    }
    return profile;
  }

  getRequesterProfileByUserId(
    userId: string,
  ): Promise<RequesterProfile | null> {
    return this.prisma.requesterProfile.findUnique({ where: { userId } });
  }

  listByMediaId(mediaId: string) {
    return this.prisma.requesterProfile.findMany({
      where: { mediaId },
      include: { user: { select: { email: true, status: true } } },
      orderBy: { lastName: 'asc' },
    });
  }

  async listRequesterProfiles(
    query: ListRequesterProfilesDto,
  ): Promise<PageResult<RequesterProfile>> {
    const page = { page: query.page, pageSize: query.pageSize };
    const where = {
      ...(query.mediaId ? { mediaId: query.mediaId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                firstName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.requesterProfile.findMany({
        where,
        orderBy: { lastName: 'asc' },
        ...toSkipTake(page),
      }),
      this.prisma.requesterProfile.count({ where }),
    ]);
    return buildPageResult(items, total, page);
  }

  async updateRequesterProfileStatus(
    id: string,
    status: RequesterStatus,
  ): Promise<RequesterProfile> {
    await this.getRequesterProfile(id);
    return this.prisma.requesterProfile.update({
      where: { id },
      data: { status },
    });
  }

  /** Habilite/revoque l'espace "Rédacteur en Chef" pour ce profil (Phase 2). */
  async updateEditorInChiefFlag(
    id: string,
    isEditorInChief: boolean,
  ): Promise<RequesterProfile> {
    await this.getRequesterProfile(id);
    return this.prisma.requesterProfile.update({
      where: { id },
      data: { isEditorInChief },
    });
  }
}
