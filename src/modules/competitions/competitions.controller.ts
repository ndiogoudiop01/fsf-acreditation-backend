import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { CompetitionsService } from './competitions.service.js';
import { ListCompetitionsDto } from './dto/list-competitions.dto.js';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liste des competitions (cahier §5)' })
  list(@Query() query: ListCompetitionsDto) {
    return this.competitions.list(query);
  }

  @Get(':id')
  @Public()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitions.get(id);
  }
}
