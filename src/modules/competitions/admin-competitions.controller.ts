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
import { CompetitionsService } from './competitions.service.js';
import { CreateCompetitionDto } from './dto/create-competition.dto.js';
import { UpdateCompetitionDto } from './dto/update-competition.dto.js';

@ApiTags('Competitions')
@ApiBearerAuth('access-token')
@Controller('admin/competitions')
export class AdminCompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Post()
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  @ApiOperation({ summary: 'Creer une competition (cahier §5)' })
  create(@Body() dto: CreateCompetitionDto) {
    return this.competitions.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COMPETITIONS_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompetitionDto,
  ) {
    return this.competitions.update(id, dto);
  }
}
