import {
  RequestStatus,
  type AccreditationCategory,
  type AccreditationRequest,
  type Match,
  type Zone,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import type { AccreditationConfigFacade } from '../../../accreditation-config/accreditation-config.facade.js';
import type { MatchesFacade } from '../../../competitions/competitions.facade.js';
import { SaveDraftRequestUseCase } from './save-draft-request.usecase.js';

describe('SaveDraftRequestUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let matches: MatchesFacade;
  let accreditationConfig: AccreditationConfigFacade;
  let useCase: SaveDraftRequestUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
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
    useCase = new SaveDraftRequestUseCase(
      prisma as unknown as PrismaService,
      matches,
      accreditationConfig,
    );
  });

  it('met a jour le brouillon existant sans en creer un nouveau', async () => {
    const existingDraft = { id: 'draft-1' } as AccreditationRequest;
    prisma.accreditationRequest.findFirst.mockResolvedValue(existingDraft);
    prisma.accreditationRequest.update.mockResolvedValue({
      ...existingDraft,
      categoryRequestedId: 'category-1',
    });

    const result = await useCase.execute({
      requesterId: 'requester-1',
      matchId: 'match-1',
      categoryRequestedId: 'category-1',
    });

    expect(prisma.accreditationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'draft-1' } }),
    );
    expect(prisma.accreditationRequest.create).not.toHaveBeenCalled();
    expect(result.categoryRequestedId).toBe('category-1');
  });

  it("cree un nouveau brouillon avec une reference unique quand aucun n'existe", async () => {
    prisma.accreditationRequest.findFirst.mockResolvedValue(null);
    prisma.accreditationRequest.findUnique.mockResolvedValue(null);
    prisma.accreditationRequest.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'new-draft',
        status: RequestStatus.DRAFT,
        ...data,
      }),
    );

    const result = await useCase.execute({
      requesterId: 'requester-1',
      matchId: 'match-1',
      categoryRequestedId: 'category-1',
    });

    expect(result.status).toBe(RequestStatus.DRAFT);
    expect(result.uniqueReference).toMatch(/^FSF-\d{4}-\d{6}$/);
  });

  it('retente la generation de reference en cas de collision', async () => {
    prisma.accreditationRequest.findFirst.mockResolvedValue(null);
    prisma.accreditationRequest.findUnique
      .mockResolvedValueOnce({ id: 'taken' } as AccreditationRequest)
      .mockResolvedValueOnce(null);
    prisma.accreditationRequest.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'new-draft', ...data }),
    );

    await useCase.execute({
      requesterId: 'requester-1',
      matchId: 'match-1',
      categoryRequestedId: 'category-1',
    });

    expect(prisma.accreditationRequest.findUnique).toHaveBeenCalledTimes(2);
  });

  it("verifie l'existence du match et de la categorie avant de sauvegarder", async () => {
    prisma.accreditationRequest.findFirst.mockResolvedValue(null);
    prisma.accreditationRequest.findUnique.mockResolvedValue(null);
    prisma.accreditationRequest.create.mockResolvedValue(
      {} as AccreditationRequest,
    );

    await useCase.execute({
      requesterId: 'requester-1',
      matchId: 'match-1',
      categoryRequestedId: 'category-1',
    });

    expect(matches.getMatch).toHaveBeenCalledWith('match-1');
    expect(accreditationConfig.getCategory).toHaveBeenCalledWith('category-1');
  });
});
