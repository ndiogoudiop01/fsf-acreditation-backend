import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { ZonesService } from './zones.service.js';

@ApiTags('Zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  @Public()
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiOperation({ summary: "Catalogue des zones d'acces (cahier §19)" })
  list(@Query('activeOnly') activeOnly?: string) {
    return this.zones.list(activeOnly === 'true');
  }

  @Get(':id')
  @Public()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.zones.get(id);
  }
}
