import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { UsersService } from '../iam/users.service.js';
import {
  REQUESTER_PROFILES_FACADE,
  type RequesterProfilesFacade,
} from '../media/media.facade.js';
import type { AddJournalistDto } from './dto/add-journalist.dto.js';

/**
 * Espace "Redacteur en Chef" (Phase 2) : un demandeur habilite
 * (`RequesterProfile.isEditorInChief`) gere la delegation presse de son
 * propre media — cf. prototype `MediaEditorView`. Lit a travers `requests`
 * pour agreger les compteurs par statut (exception documentee des modules
 * transverses, cf. docs/03-modules-et-frontieres.md du backend).
 */
@Injectable()
export class MediaDeskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    @Inject(REQUESTER_PROFILES_FACADE)
    private readonly requesterProfiles: RequesterProfilesFacade,
  ) {}

  private async assertEditor(userId: string) {
    const profile = await this.requesterProfiles.findByUserId(userId);
    if (!profile || !profile.isEditorInChief) {
      throw new ForbiddenException(
        'Cet espace est reserve aux redacteurs en chef habilites par la FSF.',
      );
    }
    return profile;
  }

  async getRoster(userId: string) {
    const editorProfile = await this.assertEditor(userId);
    const [media, colleagues] = await Promise.all([
      this.prisma.media.findUnique({ where: { id: editorProfile.mediaId } }),
      this.requesterProfiles.listByMediaId(editorProfile.mediaId),
    ]);

    const requestCounts = await this.prisma.accreditationRequest.groupBy({
      by: ['status'],
      where: { requester: { mediaId: editorProfile.mediaId } },
      _count: true,
    });

    return {
      media,
      journalists: colleagues,
      requestsByStatus: Object.fromEntries(
        requestCounts.map((c) => [c.status, c._count]),
      ),
    };
  }

  async addJournalist(userId: string, dto: AddJournalistDto) {
    const editorProfile = await this.assertEditor(userId);
    const newUser = await this.usersService.createRequesterAccount(
      dto.email,
      dto.temporaryPassword,
    );
    return this.requesterProfiles.createProfile(newUser.id, {
      ...dto,
      mediaId: editorProfile.mediaId,
    });
  }
}
