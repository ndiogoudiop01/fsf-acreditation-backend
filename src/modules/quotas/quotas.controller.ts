import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator.js';
import { QuotasService } from './quotas.service.js';

@ApiTags('Quotas')
@Controller('matches/:matchId/quotas')
export class QuotasController {
  constructor(private readonly quotas: QuotasService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Quotas configures pour un match (cahier §11)' })
  async list(@Param('matchId', ParseUUIDPipe) matchId: string) {
    const rows = await this.quotas.listForMatch(matchId);
    return rows.map((row) => ({
      categoryId: row.categoryId,
      category: row.category.label,
      quotaTotal: row.quotaTotal,
      consumed: row.consumed,
      remaining: Math.max(0, row.quotaTotal - row.consumed),
      overflowPolicy: row.overflowPolicy,
      zones: row.zones.map((z) => z.zone.label),
    }));
  }
}
