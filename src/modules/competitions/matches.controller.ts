import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { MatchesService } from './matches.service.js';
import { ListMatchesDto } from './dto/list-matches.dto.js';

@ApiTags('Matchs')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      "Liste des matchs, pour l'etape 1 du formulaire de demande (cahier §6, §9)",
  })
  list(@Query() query: ListMatchesDto) {
    return this.matches.list(query);
  }

  @Get(':id')
  @Public()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.get(id);
  }
}
