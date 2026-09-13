import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { MediaService } from './media.service.js';
import { ListMediaDto } from './dto/list-media.dto.js';
import { MediaStatus } from '@prisma/client';

@ApiTags('Medias')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('public')
  @Public()
  @ApiOperation({
    summary:
      "Liste des medias valides (pour le formulaire d'inscription, cahier §7)",
  })
  async listPublic() {
    const query: ListMediaDto = {
      page: 1,
      pageSize: 500,
      status: MediaStatus.VALIDATED,
    };
    const result = await this.mediaService.listMedia(query);
    return result.items.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      country: m.country,
    }));
  }

  @Get()
  @ApiBearerAuth('access-token')
  @RequirePermissions(Permission.MEDIA_READ)
  @ApiOperation({ summary: 'Liste des medias (back-office)' })
  list(@Query() query: ListMediaDto) {
    return this.mediaService.listMedia(query);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @RequirePermissions(Permission.MEDIA_READ)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getMedia(id);
  }
}
