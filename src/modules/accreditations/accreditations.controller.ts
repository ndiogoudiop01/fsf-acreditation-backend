import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { AccreditationsService } from './accreditations.service.js';

@ApiTags('Accreditations')
@ApiBearerAuth('access-token')
@Controller('requests/:requestId/accreditation')
export class AccreditationsController {
  constructor(private readonly accreditations: AccreditationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Mon accreditation pour cette demande (cahier §16)',
  })
  async get(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.requesterProfileId)
      throw new ForbiddenException("Ce compte n'a pas de profil demandeur.");
    return this.accreditations.getForRequest(
      requestId,
      user.requesterProfileId,
    );
  }

  @Get('download')
  @ApiOperation({ summary: 'URL temporaire signee du badge PDF' })
  async download(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.requesterProfileId)
      throw new ForbiddenException("Ce compte n'a pas de profil demandeur.");
    const accreditation = await this.accreditations.getForRequest(
      requestId,
      user.requesterProfileId,
    );
    return {
      url: await this.accreditations.getBadgeDownloadUrl(accreditation.id),
    };
  }

  @Get('qr-url')
  @ApiOperation({
    summary: 'URL temporaire signee du QR Code seul (PNG), pour affichage web',
  })
  async qrUrl(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.requesterProfileId)
      throw new ForbiddenException("Ce compte n'a pas de profil demandeur.");
    const accreditation = await this.accreditations.getForRequest(
      requestId,
      user.requesterProfileId,
    );
    return { url: await this.accreditations.getQrCodeUrl(accreditation.id) };
  }
}
