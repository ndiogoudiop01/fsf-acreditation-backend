import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { QuotasService } from './quotas.service.js';
import { SetQuotaDto } from './dto/set-quota.dto.js';

@ApiTags('Quotas')
@ApiBearerAuth('access-token')
@Controller('admin/matches/:matchId/quotas')
export class AdminQuotasController {
  constructor(private readonly quotas: QuotasService) {}

  @Get()
  @RequirePermissions(Permission.REQUESTS_ATTRIBUTE)
  @ApiOperation({
    summary:
      'Quotas configures pour un match, avec les identifiants de zones (back-office)',
  })
  async list(@Param('matchId', ParseUUIDPipe) matchId: string) {
    const rows = await this.quotas.listForMatch(matchId);
    return rows.map((row) => ({
      categoryId: row.categoryId,
      category: row.category.label,
      quotaTotal: row.quotaTotal,
      consumed: row.consumed,
      overflowPolicy: row.overflowPolicy,
      zoneIds: row.zones.map((z) => z.zoneId),
    }));
  }

  @Put()
  @RequirePermissions(Permission.REQUESTS_ATTRIBUTE)
  @ApiOperation({
    summary:
      'Definir le quota et les zones pour une categorie sur un match (cahier §11)',
  })
  set(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: SetQuotaDto,
  ) {
    return this.quotas.setQuota(matchId, dto);
  }
}
