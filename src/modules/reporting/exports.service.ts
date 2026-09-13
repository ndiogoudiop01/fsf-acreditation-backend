import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { RequestStatus, ScanResult } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../shared/kernel/errors/error-catalog.js';
import { DashboardService, PENDING_STATUSES } from './dashboard.service.js';
import type { DashboardFilterDto } from './dto/dashboard-filter.dto.js';

export type ReportKey =
  'requests' | 'accredited' | 'rejected' | 'pending' | 'entries' | 'anomalies';

export const REPORT_KEYS: ReportKey[] = [
  'requests',
  'accredited',
  'rejected',
  'pending',
  'entries',
  'anomalies',
];

const REPORT_TITLES: Record<ReportKey, string> = {
  requests: 'Toutes les demandes',
  accredited: 'Accredites par match / media / categorie',
  rejected: 'Demandes refusees',
  pending: 'Dossiers en attente',
  entries: 'Entrees controlees (scans valides)',
  anomalies: "Anomalies de controle d'acces",
};

export interface ReportColumn {
  key: string;
  header: string;
}

export interface TabularReport {
  title: string;
  scope: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
}

/**
 * Exports Excel/CSV/PDF (cahier §26). Chaque export porte le perimetre, la
 * date de generation, l'auteur et une mention de confidentialite — la
 * restriction aux roles autorises est appliquee en amont par
 * `Permission.EXPORT_DATA` (cf. `ExportsController`), qui exclut deja
 * l'Agent de controle (donnees personnelles).
 */
@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  async buildReport(
    report: ReportKey,
    filter: DashboardFilterDto,
  ): Promise<TabularReport> {
    const scope = await this.describeScope(filter);
    const title = REPORT_TITLES[report];
    switch (report) {
      case 'requests':
        return { title, scope, ...(await this.loadRequests(filter)) };
      case 'accredited':
        return { title, scope, ...(await this.loadAccredited(filter)) };
      case 'rejected':
        return { title, scope, ...(await this.loadRejected(filter)) };
      case 'pending':
        return { title, scope, ...(await this.loadPending(filter)) };
      case 'entries':
        return { title, scope, ...(await this.loadScans(filter, 'entries')) };
      case 'anomalies':
        return {
          title,
          scope,
          ...(await this.loadScans(filter, 'anomalies')),
        };
      default: {
        const exhaustive: never = report;
        throw new DomainError(
          ErrorCodes.REPORT_UNKNOWN,
          `Rapport inconnu : ${exhaustive as string}.`,
          'VALIDATION',
        );
      }
    }
  }

  // ─── Chargement des donnees, par rapport ────────────────────────────────

  private requestFilterWhere(filter: DashboardFilterDto) {
    return {
      ...(filter.matchId ? { matchId: filter.matchId } : {}),
      ...(filter.categoryId ? { categoryRequestedId: filter.categoryId } : {}),
      ...(filter.competitionId
        ? { match: { competitionId: filter.competitionId } }
        : {}),
      ...(filter.mediaId ? { requester: { mediaId: filter.mediaId } } : {}),
    };
  }

  private async loadRequests(filter: DashboardFilterDto) {
    const requests = await this.prisma.accreditationRequest.findMany({
      where: this.requestFilterWhere(filter),
      include: {
        requester: { include: { media: true } },
        match: true,
        categoryRequested: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const columns: ReportColumn[] = [
      { key: 'uniqueReference', header: 'Reference' },
      { key: 'requesterName', header: 'Demandeur' },
      { key: 'mediaName', header: 'Media' },
      { key: 'matchLabel', header: 'Match' },
      { key: 'categoryLabel', header: 'Categorie' },
      { key: 'status', header: 'Statut' },
      { key: 'submittedAt', header: 'Soumise le' },
      { key: 'decisionAt', header: 'Decision le' },
    ];
    const rows = requests.map((r) => ({
      uniqueReference: r.uniqueReference,
      requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
      mediaName: r.requester.media.name,
      matchLabel: `${r.match.homeTeam} vs ${r.match.awayTeam}`,
      categoryLabel: r.categoryRequested.label,
      status: r.status,
      submittedAt: r.submittedAt?.toISOString() ?? '',
      decisionAt: r.decisionAt?.toISOString() ?? '',
    }));
    return { columns, rows };
  }

  private async loadAccredited(filter: DashboardFilterDto) {
    const accreditations = await this.prisma.accreditation.findMany({
      where: { request: this.requestFilterWhere(filter) },
      include: {
        zones: { include: { zone: true } },
        request: {
          include: {
            requester: { include: { media: true } },
            match: true,
            categoryRequested: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
    const columns: ReportColumn[] = [
      { key: 'number', header: 'N° badge' },
      { key: 'status', header: 'Statut' },
      { key: 'requesterName', header: 'Demandeur' },
      { key: 'mediaName', header: 'Media' },
      { key: 'matchLabel', header: 'Match' },
      { key: 'categoryLabel', header: 'Categorie' },
      { key: 'zones', header: 'Zones' },
      { key: 'issuedAt', header: 'Emis le' },
      { key: 'expiresAt', header: 'Expire le' },
    ];
    const rows = accreditations.map((a) => ({
      number: a.number,
      status: a.status,
      requesterName: `${a.request.requester.firstName} ${a.request.requester.lastName}`,
      mediaName: a.request.requester.media.name,
      matchLabel: `${a.request.match.homeTeam} vs ${a.request.match.awayTeam}`,
      categoryLabel: a.request.categoryRequested.label,
      zones: a.zones.map((z) => z.zone.label).join(', '),
      issuedAt: a.issuedAt.toISOString(),
      expiresAt: a.expiresAt.toISOString(),
    }));
    return { columns, rows };
  }

  private async loadRejected(filter: DashboardFilterDto) {
    const requests = await this.prisma.accreditationRequest.findMany({
      where: {
        ...this.requestFilterWhere(filter),
        status: RequestStatus.REJECTED,
      },
      include: {
        requester: { include: { media: true } },
        match: true,
        categoryRequested: true,
      },
      orderBy: { decisionAt: 'desc' },
    });
    const deciderLabels = await this.resolveUserLabels(
      requests.map((r) => r.decisionById).filter((id): id is string => !!id),
    );
    const columns: ReportColumn[] = [
      { key: 'uniqueReference', header: 'Reference' },
      { key: 'requesterName', header: 'Demandeur' },
      { key: 'mediaName', header: 'Media' },
      { key: 'matchLabel', header: 'Match' },
      { key: 'categoryLabel', header: 'Categorie' },
      { key: 'decisionAt', header: 'Refusee le' },
      { key: 'decidedBy', header: 'Decidee par' },
      { key: 'decisionReason', header: 'Motif' },
    ];
    const rows = requests.map((r) => ({
      uniqueReference: r.uniqueReference,
      requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
      mediaName: r.requester.media.name,
      matchLabel: `${r.match.homeTeam} vs ${r.match.awayTeam}`,
      categoryLabel: r.categoryRequested.label,
      decisionAt: r.decisionAt?.toISOString() ?? '',
      decidedBy: r.decisionById
        ? (deciderLabels.get(r.decisionById) ?? r.decisionById)
        : '',
      decisionReason: r.decisionReason ?? '',
    }));
    return { columns, rows };
  }

  private async loadPending(filter: DashboardFilterDto) {
    const requests = await this.prisma.accreditationRequest.findMany({
      where: {
        ...this.requestFilterWhere(filter),
        status: { in: PENDING_STATUSES },
      },
      include: {
        requester: { include: { media: true } },
        match: true,
        categoryRequested: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
    const now = Date.now();
    const columns: ReportColumn[] = [
      { key: 'uniqueReference', header: 'Reference' },
      { key: 'requesterName', header: 'Demandeur' },
      { key: 'mediaName', header: 'Media' },
      { key: 'matchLabel', header: 'Match' },
      { key: 'categoryLabel', header: 'Categorie' },
      { key: 'status', header: 'Statut' },
      { key: 'submittedAt', header: 'Soumise le' },
      { key: 'daysPending', header: 'Jours en attente' },
    ];
    const rows = requests.map((r) => ({
      uniqueReference: r.uniqueReference,
      requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
      mediaName: r.requester.media.name,
      matchLabel: `${r.match.homeTeam} vs ${r.match.awayTeam}`,
      categoryLabel: r.categoryRequested.label,
      status: r.status,
      submittedAt: r.submittedAt?.toISOString() ?? '',
      daysPending: r.submittedAt
        ? Math.floor((now - r.submittedAt.getTime()) / 86_400_000).toString()
        : '',
    }));
    return { columns, rows };
  }

  private async loadScans(
    filter: DashboardFilterDto,
    kind: 'entries' | 'anomalies',
  ) {
    const requestWhere = {
      ...(filter.categoryId ? { categoryRequestedId: filter.categoryId } : {}),
      ...(filter.competitionId
        ? { match: { competitionId: filter.competitionId } }
        : {}),
      ...(filter.mediaId ? { requester: { mediaId: filter.mediaId } } : {}),
    };
    const hasRequestFilter = Object.keys(requestWhere).length > 0;

    const scans = await this.prisma.scanLog.findMany({
      where: {
        ...(filter.matchId ? { matchId: filter.matchId } : {}),
        result:
          kind === 'entries' ? ScanResult.VALID : { not: ScanResult.VALID },
        ...(hasRequestFilter
          ? { accreditation: { request: requestWhere } }
          : {}),
      },
      include: {
        zone: true,
        match: true,
        scannedBy: true,
        accreditation: {
          include: {
            request: {
              include: {
                requester: { include: { media: true } },
                categoryRequested: true,
              },
            },
          },
        },
      },
      orderBy: { scannedAt: 'desc' },
    });

    const columns: ReportColumn[] = [
      { key: 'scannedAt', header: 'Horodatage' },
      { key: 'matchLabel', header: 'Match' },
      { key: 'result', header: 'Resultat' },
      { key: 'reason', header: 'Motif' },
      { key: 'zoneLabel', header: 'Zone' },
      { key: 'gate', header: 'Poste' },
      { key: 'agent', header: 'Agent' },
      { key: 'requesterName', header: 'Titulaire' },
      { key: 'mediaName', header: 'Media' },
      { key: 'categoryLabel', header: 'Categorie' },
    ];
    const rows = scans.map((s) => ({
      scannedAt: s.scannedAt.toISOString(),
      matchLabel: `${s.match.homeTeam} vs ${s.match.awayTeam}`,
      result: s.result,
      reason: s.reason ?? '',
      zoneLabel: s.zone?.label ?? '',
      gate: s.gate ?? '',
      agent: s.scannedBy.displayName ?? s.scannedBy.email,
      requesterName: s.accreditation
        ? `${s.accreditation.request.requester.firstName} ${s.accreditation.request.requester.lastName}`
        : '',
      mediaName: s.accreditation?.request.requester.media.name ?? '',
      categoryLabel: s.accreditation?.request.categoryRequested.label ?? '',
    }));
    return { columns, rows };
  }

  /** Rapport jour de match (cahier §22, §26) : synthese narrative en PDF. */
  async matchDayPdf(
    matchId: string,
    generatedBy: string,
    generatedByRole: string | null,
  ): Promise<Buffer> {
    const match = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
    });
    const stats = await this.dashboard.getMatchDayStats(matchId);
    const zoneIds = stats.zoneBreakdown
      .map((z) => z.zoneId)
      .filter((id): id is string => !!id);
    const zones = await this.prisma.zone.findMany({
      where: { id: { in: zoneIds } },
    });
    const zoneLabel = new Map(zones.map((z) => [z.id, z.label]));

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(14)
        .text('FEDERATION SENEGALAISE DE FOOTBALL', { align: 'center' });
      doc.fontSize(12).text('RAPPORT JOUR DE MATCH', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(11)
        .text(`${match.homeTeam} vs ${match.awayTeam}`, { align: 'center' });
      doc
        .fontSize(9)
        .text(
          `${match.stadium}, ${match.city} — ${match.kickoffAt.toLocaleString('fr-FR', { timeZone: match.timezone })}`,
          { align: 'center' },
        );
      doc.moveDown();
      doc.fontSize(8);
      for (const line of this.metadataLines(
        {
          title: 'Rapport jour de match',
          scope: `Match : ${match.homeTeam} vs ${match.awayTeam}`,
        },
        generatedBy,
        generatedByRole,
      )) {
        doc.text(line);
      }
      doc.moveDown();

      doc.fontSize(11).text('Indicateurs', { underline: true });
      doc.fontSize(9);
      doc.text(`Accredites actifs : ${stats.accredited}`);
      doc.text(`Entrees validees : ${stats.entries}`);
      doc.text(`Refus / anomalies : ${stats.refusals}`);
      doc.text(`Appareils de controle actifs : ${stats.activeDevices}`);
      doc.moveDown();

      doc.fontSize(11).text('Repartition par zone', { underline: true });
      doc.fontSize(9);
      if (stats.zoneBreakdown.length === 0) {
        doc.text('Aucun scan enregistre.');
      }
      for (const z of stats.zoneBreakdown) {
        const label = z.zoneId
          ? (zoneLabel.get(z.zoneId) ?? z.zoneId)
          : 'Zone non renseignee';
        doc.text(`${label} : ${z.count}`);
      }
      doc.moveDown();

      doc.fontSize(11).text('20 derniers scans', { underline: true });
      doc.fontSize(8);
      if (stats.lastScans.length === 0) {
        doc.text('Aucun scan enregistre.');
      }
      for (const s of stats.lastScans) {
        doc.text(
          `${s.scannedAt.toISOString()} — ${s.result}${s.reason ? ` (${s.reason})` : ''}`,
        );
      }

      doc.end();
    });
  }

  // ─── Rendu generique CSV / Excel / PDF ──────────────────────────────────

  private metadataLines(
    report: Pick<TabularReport, 'title' | 'scope'>,
    generatedBy: string,
    generatedByRole: string | null,
  ): string[] {
    return [
      `Rapport : ${report.title}`,
      `Perimetre : ${report.scope}`,
      `Genere le ${new Date().toISOString()} par ${generatedBy}${generatedByRole ? ` (${generatedByRole})` : ''}`,
      'Confidentialite : usage interne FSF — donnees personnelles, ne pas diffuser',
    ];
  }

  toCsv(
    report: TabularReport,
    generatedBy: string,
    generatedByRole: string | null,
  ): Buffer {
    const meta = this.metadataLines(report, generatedBy, generatedByRole).map(
      (line) => `# ${line}`,
    );
    const csv = stringify(report.rows, {
      header: true,
      columns: report.columns.map((c) => ({ key: c.key, header: c.header })),
    });
    return Buffer.from([...meta, '', csv].join('\n'), 'utf8');
  }

  async toExcel(
    report: TabularReport,
    generatedBy: string,
    generatedByRole: string | null,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = generatedBy;
    workbook.created = new Date();
    // Les noms d'onglet Excel interdisent * ? : \ / [ ] et sont limites a 31 caracteres.
    const sheetName =
      report.title.replace(/[*?:\\/[\]]/g, '-').slice(0, 31) || 'Rapport';
    const sheet = workbook.addWorksheet(sheetName);
    for (const line of this.metadataLines(
      report,
      generatedBy,
      generatedByRole,
    )) {
      sheet.addRow([line]);
    }
    sheet.addRow([]);
    const headerRow = sheet.addRow(report.columns.map((c) => c.header));
    headerRow.font = { bold: true };
    for (const row of report.rows) {
      sheet.addRow(report.columns.map((c) => row[c.key] ?? ''));
    }
    sheet.columns = report.columns.map(() => ({ width: 22 }));
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async toPdf(
    report: TabularReport,
    generatedBy: string,
    generatedByRole: string | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 32,
        layout: 'landscape',
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(13)
        .text('FEDERATION SENEGALAISE DE FOOTBALL', { align: 'center' });
      doc.fontSize(11).text(report.title, { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(8);
      for (const line of this.metadataLines(
        report,
        generatedBy,
        generatedByRole,
      )) {
        doc.text(line);
      }
      doc.moveDown(0.6);

      const { columns, rows } = report;
      const left = doc.page.margins.left;
      const pageWidth = doc.page.width - left - doc.page.margins.right;
      const colWidth =
        columns.length > 0 ? pageWidth / columns.length : pageWidth;
      const bottomLimit = doc.page.height - doc.page.margins.bottom;

      const drawHeaderRow = () => {
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(8);
        columns.forEach((c, i) => {
          doc.text(c.header, left + i * colWidth, y, {
            width: colWidth - 4,
            ellipsis: true,
          });
        });
        doc.font('Helvetica');
        doc.moveDown(0.9);
        doc
          .moveTo(left, doc.y)
          .lineTo(left + pageWidth, doc.y)
          .strokeColor('#cccccc')
          .stroke();
        doc.moveDown(0.2);
      };

      drawHeaderRow();
      for (const row of rows) {
        if (doc.y > bottomLimit - 16) {
          doc.addPage();
          drawHeaderRow();
        }
        const y = doc.y;
        doc.fontSize(7);
        columns.forEach((c, i) => {
          doc.text(String(row[c.key] ?? ''), left + i * colWidth, y, {
            width: colWidth - 4,
            ellipsis: true,
          });
        });
        doc.moveDown(0.65);
      }

      if (rows.length === 0) {
        doc.fontSize(9).text('Aucune donnee pour ce perimetre.');
      }

      doc.end();
    });
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────

  private async describeScope(filter: DashboardFilterDto): Promise<string> {
    const parts: string[] = [];
    if (filter.matchId) {
      const match = await this.prisma.match.findUnique({
        where: { id: filter.matchId },
      });
      parts.push(
        match
          ? `Match : ${match.homeTeam} vs ${match.awayTeam} (${match.stadium}, ${match.kickoffAt.toLocaleDateString('fr-FR')})`
          : 'Match : inconnu',
      );
    } else if (filter.competitionId) {
      const competition = await this.prisma.competition.findUnique({
        where: { id: filter.competitionId },
      });
      parts.push(
        competition
          ? `Competition : ${competition.name} (${competition.season})`
          : 'Competition : inconnue',
      );
    }
    if (filter.mediaId) {
      const media = await this.prisma.media.findUnique({
        where: { id: filter.mediaId },
      });
      parts.push(media ? `Media : ${media.name}` : 'Media : inconnu');
    }
    if (filter.categoryId) {
      const category = await this.prisma.accreditationCategory.findUnique({
        where: { id: filter.categoryId },
      });
      parts.push(
        category ? `Categorie : ${category.label}` : 'Categorie : inconnue',
      );
    }
    return parts.length > 0
      ? parts.join(' — ')
      : 'Tous matchs, medias et categories confondus';
  }

  private async resolveUserLabels(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, displayName: true, email: true },
    });
    return new Map(users.map((u) => [u.id, u.displayName ?? u.email]));
  }
}
