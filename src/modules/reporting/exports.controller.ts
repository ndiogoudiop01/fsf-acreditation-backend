import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { RawResponse } from '../../shared/decorators/raw-response.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Permission } from '../../shared/kernel/permissions/permission-catalog.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import type { AuthenticatedUser } from '../../shared/kernel/types/authenticated-user.js';
import {
  ExportsService,
  REPORT_KEYS,
  type ReportKey,
} from './exports.service.js';
import { DashboardFilterDto } from './dto/dashboard-filter.dto.js';
import { MatchDayReportDto } from './dto/match-day-report.dto.js';

const CONTENT_TYPES = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

function assertKnownReport(report: string): ReportKey {
  if (!REPORT_KEYS.includes(report as ReportKey)) {
    throw new DomainError(
      ErrorCodes.REPORT_UNKNOWN,
      `Rapport inconnu : ${report}. Valeurs possibles : ${REPORT_KEYS.join(', ')}.`,
      'VALIDATION',
    );
  }
  return report as ReportKey;
}

/**
 * Exports Excel/CSV/PDF (cahier §26) : accredites, demandes refusees,
 * dossiers en attente, entrees, anomalies, toutes demandes — plus un
 * rapport jour de match dedie. Reserves aux roles autorises
 * (`Permission.EXPORT_DATA` exclut l'Agent de controle, cf. §23).
 */
@ApiTags('Exports & reporting')
@ApiBearerAuth('access-token')
@Controller('admin/exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  // Route statique DECLAREE AVANT `:report/:format` : sinon Nest tenterait
  // de matcher "match-day" comme valeur de `:report` sur la route generique.
  @Get('match-day/:format')
  @RequirePermissions(Permission.EXPORT_DATA)
  @RawResponse()
  @ApiParam({ name: 'format', enum: ['pdf'] })
  @ApiOperation({ summary: 'Rapport jour de match (cahier §22, §26)' })
  async matchDay(
    @Param('format') format: string,
    @Query() filter: MatchDayReportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    if (format !== 'pdf') {
      throw new DomainError(
        ErrorCodes.REPORT_UNKNOWN,
        'Le rapport jour de match est disponible uniquement au format PDF.',
        'VALIDATION',
      );
    }
    const buffer = await this.exports.matchDayPdf(
      filter.matchId,
      user.email,
      user.role,
    );
    res.setHeader('Content-Type', CONTENT_TYPES.pdf);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport-jour-de-match.pdf"`,
    );
    res.send(buffer);
  }

  @Get(':report/:format')
  @RequirePermissions(Permission.EXPORT_DATA)
  @RawResponse()
  @ApiParam({ name: 'report', enum: REPORT_KEYS })
  @ApiParam({ name: 'format', enum: ['csv', 'xlsx', 'pdf'] })
  @ApiOperation({
    summary:
      'Rapports accredites/refuses/en attente/entrees/anomalies (cahier §26)',
  })
  async report(
    @Param('report') reportParam: string,
    @Param('format') format: string,
    @Query() filter: DashboardFilterDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const report = assertKnownReport(reportParam);
    const data = await this.exports.buildReport(report, filter);

    let buffer: Buffer;
    switch (format) {
      case 'csv':
        buffer = this.exports.toCsv(data, user.email, user.role);
        break;
      case 'xlsx':
        buffer = await this.exports.toExcel(data, user.email, user.role);
        break;
      case 'pdf':
        buffer = await this.exports.toPdf(data, user.email, user.role);
        break;
      default:
        throw new DomainError(
          ErrorCodes.REPORT_UNKNOWN,
          `Format inconnu : ${format}. Valeurs possibles : csv, xlsx, pdf.`,
          'VALIDATION',
        );
    }

    res.setHeader(
      'Content-Type',
      CONTENT_TYPES[format as keyof typeof CONTENT_TYPES],
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report}.${format}"`,
    );
    res.send(buffer);
  }
}
