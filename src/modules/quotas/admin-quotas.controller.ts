import { Body, Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';
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
