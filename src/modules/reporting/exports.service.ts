import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import type { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

const COLUMNS = [
  { header: 'Reference', key: 'uniqueReference' },
  { header: 'Demandeur', key: 'requesterName' },
  { header: 'Media', key: 'mediaName' },
  { header: 'Match', key: 'matchLabel' },
  { header: 'Categorie', key: 'categoryLabel' },
  { header: 'Statut', key: 'status' },
  { header: 'Soumise le', key: 'submittedAt' },
  { header: 'Decision le', key: 'decisionAt' },
] as const;

/** Exports Excel/CSV (cahier §26). Chaque export porte la date de generation et l'auteur. */
@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadRows(filter: DashboardFilterDto) {
    const requests = await this.prisma.accreditationRequest.findMany({
      where: {
        ...(filter.matchId ? { matchId: filter.matchId } : {}),
        ...(filter.categoryId
          ? { categoryRequestedId: filter.categoryId }
          : {}),
        ...(filter.competitionId
          ? { match: { competitionId: filter.competitionId } }
          : {}),
        ...(filter.mediaId ? { requester: { mediaId: filter.mediaId } } : {}),
      },
      include: {
        requester: { include: { media: true } },
        match: true,
        categoryRequested: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      uniqueReference: r.uniqueReference,
      requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
      mediaName: r.requester.media.name,
      matchLabel: `${r.match.homeTeam} vs ${r.match.awayTeam}`,
      categoryLabel: r.categoryRequested.label,
      status: r.status,
      submittedAt: r.submittedAt?.toISOString() ?? '',
      decisionAt: r.decisionAt?.toISOString() ?? '',
    }));
  }

  async toCsv(
    filter: DashboardFilterDto,
    generatedBy: string,
  ): Promise<Buffer> {
    const rows = await this.loadRows(filter);
    const header = [
      `# Genere le ${new Date().toISOString()} par ${generatedBy} — usage interne FSF`,
    ];
    const csv = stringify(rows, {
      header: true,
      columns: COLUMNS.map((c) => ({ key: c.key, header: c.header })),
    });
    return Buffer.from([...header, csv].join('\n'), 'utf8');
  }

  async toExcel(
    filter: DashboardFilterDto,
    generatedBy: string,
  ): Promise<Buffer> {
    const rows = await this.loadRows(filter);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = generatedBy;
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Demandes');
    sheet.columns = COLUMNS.map((c) => ({ key: c.key, width: 22 }));
    sheet.addRow([
      `Genere le ${new Date().toISOString()} par ${generatedBy} — usage interne FSF, confidentiel`,
    ]);
    sheet.addRow([]);
    sheet.addRow(COLUMNS.map((c) => c.header));
    for (const row of rows) sheet.addRow(row);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
