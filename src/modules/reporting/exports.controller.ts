import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RawResponse } from '../../shared/decorators/raw-response.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import { ExportsService } from './exports.service.js';
import { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

@ApiTags('Tableau de bord')
@ApiBearerAuth('access-token')
@Controller('admin/exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('requests.csv')
  @RequirePermissions(Permission.EXPORT_DATA)
  @RawResponse()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="demandes.csv"')
  @ApiOperation({ summary: 'Export CSV des demandes (cahier §26)' })
  async csv(
    @Query() filter: DashboardFilterDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    res.send(await this.exports.toCsv(filter, user.email));
  }

  @Get('requests.xlsx')
  @RequirePermissions(Permission.EXPORT_DATA)
  @RawResponse()
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename="demandes.xlsx"')
  @ApiOperation({ summary: 'Export Excel des demandes (cahier §26)' })
  async excel(
    @Query() filter: DashboardFilterDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    res.send(await this.exports.toExcel(filter, user.email));
  }
}
