import type {
  AccreditationCategory,
  Match,
  MatchCategoryQuota,
  Zone,
} from '@prisma/client';
import { OverflowPolicy } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../shared/kernel/errors/domain.error.js';
import type { AccreditationConfigFacade } from '../accreditation-config/accreditation-config.facade.js';
import type { MatchesFacade } from '../competitions/competitions.facade.js';
import { QuotasService } from './quotas.service.js';

function buildQuota(
  overrides: Partial<MatchCategoryQuota> = {},
): MatchCategoryQuota {
  return {
    id: 'quota-1',
    matchId: 'match-1',
    categoryId: 'category-1',
    quotaTotal: 5,
    consumed: 0,
    overflowPolicy: OverflowPolicy.QUEUE,
    ...overrides,
  } as MatchCategoryQuota;
}

describe('QuotasService', () => {
  let prisma: {
    matchCategoryQuota: {
      upsert: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    matchCategoryQuotaZone: {
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let matches: MatchesFacade;
  let accreditationConfig: AccreditationConfigFacade;
  let service: QuotasService;

  beforeEach(() => {
    prisma = {
      matchCategoryQuota: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      matchCategoryQuotaZone: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    matches = {
      getMatch: vi.fn().mockResolvedValue({ id: 'match-1' } as Match),
      assertAcceptingRequests: vi.fn(),
    };
    accreditationConfig = {
      getCategory: vi
        .fn()
        .mockResolvedValue({ id: 'category-1' } as AccreditationCategory),
      getZone: vi.fn().mockResolvedValue({ id: 'zone-1' } as Zone),
    };
    service = new QuotasService(
      prisma as unknown as PrismaService,
      matches,
      accreditationConfig,
    );
  });

  describe('setQuota', () => {
    it('verifie le match, la categorie et chaque zone avant de creer le quota', async () => {
      prisma.matchCategoryQuota.upsert.mockResolvedValue(buildQuota());
      prisma.matchCategoryQuotaZone.deleteMany.mockResolvedValue({ count: 0 });
      prisma.matchCategoryQuotaZone.createMany.mockResolvedValue({ count: 1 });

      await service.setQuota('match-1', {
        categoryId: 'category-1',
        quotaTotal: 5,
        overflowPolicy: OverflowPolicy.QUEUE,
        zoneIds: ['zone-1'],
      });

      expect(matches.getMatch).toHaveBeenCalledWith('match-1');
      expect(accreditationConfig.getCategory).toHaveBeenCalledWith(
        'category-1',
      );
      expect(accreditationConfig.getZone).toHaveBeenCalledWith('zone-1');
      expect(prisma.matchCategoryQuotaZone.createMany).toHaveBeenCalledWith({
        data: [{ quotaId: 'quota-1', zoneId: 'zone-1' }],
      });
    });

    it('ne recree pas de lignes de zone quand la liste de zones est vide', async () => {
      prisma.matchCategoryQuota.upsert.mockResolvedValue(buildQuota());
      prisma.matchCategoryQuotaZone.deleteMany.mockResolvedValue({ count: 2 });

      await service.setQuota('match-1', {
        categoryId: 'category-1',
        quotaTotal: 5,
        overflowPolicy: OverflowPolicy.QUEUE,
        zoneIds: [],
      });

      expect(prisma.matchCategoryQuotaZone.deleteMany).toHaveBeenCalledWith({
        where: { quotaId: 'quota-1' },
      });
      expect(prisma.matchCategoryQuotaZone.createMany).not.toHaveBeenCalled();
    });

    it("propage une erreur si une zone referencee n'existe pas", async () => {
      (
        accreditationConfig.getZone as ReturnType<typeof vi.fn>
      ).mockRejectedValue(
        new DomainError('ZONE_NOT_FOUND', 'Zone introuvable.', 'NOT_FOUND'),
      );

      await expect(
        service.setQuota('match-1', {
          categoryId: 'category-1',
          quotaTotal: 5,
          overflowPolicy: OverflowPolicy.QUEUE,
          zoneIds: ['unknown-zone'],
        }),
      ).rejects.toMatchObject({ code: 'ZONE_NOT_FOUND' });
      expect(prisma.matchCategoryQuota.upsert).not.toHaveBeenCalled();
    });
  });

  describe('reserveSlot', () => {
    it("reserve une place quand le quota n'est pas plein (updateMany atomique)", async () => {
      prisma.matchCategoryQuota.findUnique
        .mockResolvedValueOnce(buildQuota({ consumed: 2 }))
        .mockResolvedValueOnce(buildQuota({ consumed: 3 }));
      prisma.matchCategoryQuota.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.reserveSlot('match-1', 'category-1');

      expect(prisma.matchCategoryQuota.updateMany).toHaveBeenCalledWith({
        where: { id: 'quota-1', consumed: { lt: 5 } },
        data: { consumed: { increment: 1 } },
      });
      expect(result).toEqual({
        reserved: true,
        overflowPolicy: OverflowPolicy.QUEUE,
        quotaTotal: 5,
        consumed: 3,
      });
    });

    it('ne reserve rien quand le quota est deja plein (course concurrente)', async () => {
      prisma.matchCategoryQuota.findUnique
        .mockResolvedValueOnce(buildQuota({ consumed: 5 }))
        .mockResolvedValueOnce(buildQuota({ consumed: 5 }));
      prisma.matchCategoryQuota.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.reserveSlot('match-1', 'category-1');

      expect(result.reserved).toBe(false);
      expect(result.consumed).toBe(5);
    });

    it("leve QUOTA_NOT_CONFIGURED quand aucun quota n'existe pour ce match/categorie", async () => {
      prisma.matchCategoryQuota.findUnique.mockResolvedValue(null);

      await expect(
        service.reserveSlot('match-1', 'category-1'),
      ).rejects.toMatchObject({ code: 'QUOTA_NOT_CONFIGURED' });
      expect(prisma.matchCategoryQuota.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('releaseSlot', () => {
    it('decremente le compteur consomme', async () => {
      prisma.matchCategoryQuota.findUnique.mockResolvedValue(
        buildQuota({ consumed: 3 }),
      );

      await service.releaseSlot('match-1', 'category-1');

      expect(prisma.matchCategoryQuota.update).toHaveBeenCalledWith({
        where: { id: 'quota-1' },
        data: { consumed: { decrement: 1 } },
      });
    });

    it('ne decremente jamais sous zero', async () => {
      prisma.matchCategoryQuota.findUnique.mockResolvedValue(
        buildQuota({ consumed: 0 }),
      );

      await service.releaseSlot('match-1', 'category-1');

      expect(prisma.matchCategoryQuota.update).not.toHaveBeenCalled();
    });
  });
});
