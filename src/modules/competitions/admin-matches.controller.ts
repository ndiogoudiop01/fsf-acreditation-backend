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
import { MatchesService } from './matches.service.js';
import { CreateMatchDto } from './dto/create-match.dto.js';
import { UpdateMatchDto } from './dto/update-match.dto.js';

@ApiTags('Matchs')
@ApiBearerAuth('access-token')
@Controller('admin/matches')
export class AdminMatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post()
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  @ApiOperation({ summary: 'Creer un match (cahier §6)' })
  create(@Body() dto: CreateMatchDto) {
    return this.matches.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  @ApiOperation({
    summary: 'Modifier un match (journalise si impact sur les demandes)',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMatchDto) {
    return this.matches.update(id, dto);
  }
}
