import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { DashboardService } from './dashboard.service.js';
import { SearchService } from './search.service.js';
import { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

@ApiTags('Tableau de bord')
@ApiBearerAuth('access-token')
@Controller('admin/dashboard')
export class ReportingController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly search: SearchService,
  ) {}

  @Get()
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Indicateurs globaux (cahier §21)' })
  global(@Query() filter: DashboardFilterDto) {
    return this.dashboard.getGlobalStats(filter);
  }

  @Get('matches/:matchId/day')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Tableau de bord jour de match (cahier §22)' })
  matchDay(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.dashboard.getMatchDayStats(matchId);
  }

  @Get('search')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiQuery({ name: 'q', required: true })
  @ApiOperation({ summary: 'Recherche transverse (cahier §25)' })
  searchAll(@Query('q') term: string) {
    return this.search.search(term);
  }
}
