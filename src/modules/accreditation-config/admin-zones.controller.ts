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
import { ZonesService } from './zones.service.js';
import { CreateZoneDto } from './dto/create-zone.dto.js';
import { UpdateZoneDto } from './dto/update-zone.dto.js';

@ApiTags('Zones')
@ApiBearerAuth('access-token')
@Controller('admin/zones')
export class AdminZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Post()
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  @ApiOperation({ summary: "Creer une zone d'acces (cahier §19)" })
  create(@Body() dto: CreateZoneDto) {
    return this.zones.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZoneDto) {
    return this.zones.update(id, dto);
  }
}
