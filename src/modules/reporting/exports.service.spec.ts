import { RequestStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import type { DashboardService } from './dashboard.service.js';
import { ExportsService, type TabularReport } from './exports.service.js';

describe('ExportsService', () => {
  let prisma: {
    accreditationRequest: { findMany: ReturnType<typeof vi.fn> };
    match: { findUnique: ReturnType<typeof vi.fn> };
    media: { findUnique: ReturnType<typeof vi.fn> };
    competition: { findUnique: ReturnType<typeof vi.fn> };
    accreditationCategory: { findUnique: ReturnType<typeof vi.fn> };
    user: { findMany: ReturnType<typeof vi.fn> };
  };
  let dashboard: DashboardService;
  let service: ExportsService;

  beforeEach(() => {
    prisma = {
      accreditationRequest: { findMany: vi.fn() },
      match: { findUnique: vi.fn() },
      media: { findUnique: vi.fn() },
      competition: { findUnique: vi.fn() },
      accreditationCategory: { findUnique: vi.fn() },
      user: { findMany: vi.fn() },
    };
    dashboard = {} as DashboardService;
    service = new ExportsService(prisma as unknown as PrismaService, dashboard);
  });

  describe('buildReport (pending)', () => {
    it('decrit le perimetre a partir du match filtre et charge les dossiers en attente', async () => {
      prisma.match.findUnique.mockResolvedValue({
        homeTeam: 'Senegal',
        awayTeam: 'Maroc',
        stadium: 'Stade Abdoulaye Wade',
        kickoffAt: new Date('2026-09-15T18:00:00Z'),
      });
      const submittedAt = new Date(Date.now() - 2 * 86_400_000);
      prisma.accreditationRequest.findMany.mockResolvedValue([
        {
          uniqueReference: 'FSF-2026-000001',
          requester: {
            firstName: 'Amina',
            lastName: 'Diop',
            media: { name: 'RTS' },
          },
          match: { homeTeam: 'Senegal', awayTeam: 'Maroc' },
          categoryRequested: { label: 'Presse ecrite' },
          status: RequestStatus.UNDER_REVIEW,
          submittedAt,
        },
      ]);

      const report = await service.buildReport('pending', {
        matchId: 'match-1',
      });

      expect(report.scope).toContain('Senegal vs Maroc');
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0]).toMatchObject({
        uniqueReference: 'FSF-2026-000001',
        requesterName: 'Amina Diop',
        mediaName: 'RTS',
        status: RequestStatus.UNDER_REVIEW,
        daysPending: '2',
      });
    });

    it('decrit le perimetre comme "tous" quand aucun filtre n\'est fourni', async () => {
      prisma.accreditationRequest.findMany.mockResolvedValue([]);

      const report = await service.buildReport('pending', {});

      expect(report.scope).toBe('Tous matchs, medias et categories confondus');
      expect(report.rows).toEqual([]);
    });
  });

  describe('toCsv', () => {
    it("inclut le perimetre, la date, l'auteur et la mention de confidentialite (cahier §26)", () => {
      const report: TabularReport = {
        title: 'Dossiers en attente',
        scope: 'Match : Senegal vs Maroc',
        columns: [{ key: 'ref', header: 'Reference' }],
        rows: [{ ref: 'FSF-1' }],
      };

      const csv = service
        .toCsv(report, 'admin@fsf.sn', 'ADMIN')
        .toString('utf8');

      expect(csv).toContain('# Rapport : Dossiers en attente');
      expect(csv).toContain('# Perimetre : Match : Senegal vs Maroc');
      expect(csv).toContain('par admin@fsf.sn (ADMIN)');
      expect(csv).toContain('Confidentialite');
      expect(csv).toContain('FSF-1');
    });
  });

  describe('toExcel', () => {
    it("assainit le nom d'onglet quand le titre contient des caracteres interdits par Excel", async () => {
      const report: TabularReport = {
        title: 'Accredites par match / media / categorie',
        scope: 'Tous matchs, medias et categories confondus',
        columns: [{ key: 'ref', header: 'Reference' }],
        rows: [],
      };

      // Ne doit pas lever — regression sur les caracteres * ? : \ / [ ] interdits par ExcelJS.
      const buffer = await service.toExcel(report, 'admin@fsf.sn', 'ADMIN');
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
