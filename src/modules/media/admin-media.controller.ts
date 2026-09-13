import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { MediaService } from './media.service.js';
import { CreateMediaDto } from './dto/create-media.dto.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { UpdateMediaStatusDto } from './dto/update-media-status.dto.js';

@ApiTags('Medias')
@ApiBearerAuth('access-token')
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @RequirePermissions(Permission.MEDIA_MANAGE)
  @ApiOperation({ summary: 'Creer un media (cahier §7)' })
  create(@Body() dto: CreateMediaDto) {
    return this.mediaService.createMedia(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.MEDIA_MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.updateMedia(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.MEDIA_MANAGE)
  @ApiOperation({ summary: 'Valider/rejeter/suspendre un media' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaStatusDto,
  ) {
    return this.mediaService.updateMediaStatus(id, dto.status);
  }
}
