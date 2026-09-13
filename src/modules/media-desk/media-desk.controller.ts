import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { MediaDeskService } from './media-desk.service.js';
import { AddJournalistDto } from './dto/add-journalist.dto.js';

@ApiTags('Redacteur en chef')
@ApiBearerAuth('access-token')
@Controller('media-desk')
export class MediaDeskController {
  constructor(private readonly mediaDesk: MediaDeskService) {}

  @Get('roster')
  @ApiOperation({
    summary:
      'Delegation presse de mon media (cahier — espace Redacteur en Chef, Phase 2)',
  })
  roster(@CurrentUser() user: AuthenticatedUser) {
    return this.mediaDesk.getRoster(user.id);
  }

  @Post('journalists')
  @ApiOperation({
    summary: 'Ajouter un envoye special (en 1 clic) pour mon media',
  })
  addJournalist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddJournalistDto,
  ) {
    return this.mediaDesk.addJournalist(user.id, dto);
  }
}
