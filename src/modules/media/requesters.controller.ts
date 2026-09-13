import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { MediaService } from './media.service.js';
import { ListRequesterProfilesDto } from './dto/list-requester-profiles.dto.js';
import { UpdateRequesterStatusDto } from './dto/update-requester-status.dto.js';
import { UpdateEditorInChiefDto } from './dto/update-editor-in-chief.dto.js';

@ApiTags('Demandeurs')
@ApiBearerAuth('access-token')
@Controller('requesters')
export class RequestersController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil du demandeur connecte (cahier §8)' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    if (!user.requesterProfileId) {
      throw new ForbiddenException("Ce compte n'a pas de profil demandeur.");
    }
    return this.mediaService.getRequesterProfile(user.requesterProfileId);
  }

  @Get()
  @RequirePermissions(Permission.MEDIA_READ)
  @ApiOperation({ summary: 'Liste des profils demandeurs (back-office)' })
  list(@Query() query: ListRequesterProfilesDto) {
    return this.mediaService.listRequesterProfiles(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.MEDIA_READ)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getRequesterProfile(id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.MEDIA_MANAGE)
  @ApiOperation({ summary: 'Valider/rejeter/suspendre un profil demandeur' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequesterStatusDto,
  ) {
    return this.mediaService.updateRequesterProfileStatus(id, dto.status);
  }

  @Patch(':id/editor-in-chief')
  @RequirePermissions(Permission.MEDIA_MANAGE)
  @ApiOperation({
    summary: 'Habiliter/revoquer l\'espace "Redacteur en Chef" (Phase 2)',
  })
  updateEditorInChief(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEditorInChiefDto,
  ) {
    return this.mediaService.updateEditorInChiefFlag(id, dto.isEditorInChief);
  }
}
