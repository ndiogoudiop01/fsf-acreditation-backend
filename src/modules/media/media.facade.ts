import { Injectable } from '@nestjs/common';
import type { RequesterProfile } from '@prisma/client';
import { MediaService } from './media.service.js';
import type { CreateRequesterProfileDto } from './dto/create-requester-profile.dto.js';

export const REQUESTER_PROFILES_FACADE = Symbol('REQUESTER_PROFILES_FACADE');

type RequesterProfileWithUser = Awaited<
  ReturnType<MediaService['listByMediaId']>
>[number];

/**
 * Point d'entree PUBLIC du module `media`, seul fichier qu'un autre module a
 * le droit d'importer (cf. docs/03-modules-et-frontieres.md). Utilise par
 * `iam` pour creer le profil professionnel au moment de l'inscription, et
 * par `media-desk` pour l'espace "Redacteur en Chef" (Phase 2).
 */
export interface RequesterProfilesFacade {
  createProfile(
    userId: string,
    dto: CreateRequesterProfileDto,
  ): Promise<RequesterProfile>;
  findByUserId(userId: string): Promise<RequesterProfile | null>;
  listByMediaId(mediaId: string): Promise<RequesterProfileWithUser[]>;
}

@Injectable()
export class MediaFacade implements RequesterProfilesFacade {
  constructor(private readonly mediaService: MediaService) {}

  createProfile(
    userId: string,
    dto: CreateRequesterProfileDto,
  ): Promise<RequesterProfile> {
    return this.mediaService.createRequesterProfile(userId, dto);
  }

  findByUserId(userId: string): Promise<RequesterProfile | null> {
    return this.mediaService.getRequesterProfileByUserId(userId);
  }

  listByMediaId(mediaId: string): Promise<RequesterProfileWithUser[]> {
    return this.mediaService.listByMediaId(mediaId);
  }
}
