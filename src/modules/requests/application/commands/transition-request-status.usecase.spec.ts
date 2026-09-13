import { RequestStatus, type AccreditationRequest } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { TransitionRequestStatusUseCase } from './transition-request-status.usecase.js';

function buildRequest(
  overrides: Partial<AccreditationRequest> = {},
): AccreditationRequest {
  return {
    id: 'req-1',
    status: RequestStatus.UNDER_REVIEW,
    requesterId: 'requester-1',
    matchId: 'match-1',
    categoryRequestedId: 'category-1',
    ...overrides,
  } as AccreditationRequest;
}

describe('TransitionRequestStatusUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    requestDecision: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let useCase: TransitionRequestStatusUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: { findUnique: vi.fn(), update: vi.fn() },
      requestDecision: { create: vi.fn() },
      $transaction: vi.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    useCase = new TransitionRequestStatusUseCase(
      prisma as unknown as PrismaService,
    );
  });

  it('applique la transition et journalise la decision quand elle est autorisee', async () => {
    const existing = buildRequest({ status: RequestStatus.UNDER_REVIEW });
    const updated = buildRequest({ status: RequestStatus.COMPLETE });
    prisma.accreditationRequest.findUnique.mockResolvedValue(existing);
    prisma.accreditationRequest.update.mockResolvedValue(updated);
    prisma.requestDecision.create.mockResolvedValue({});

    const result = await useCase.execute({
      requestId: 'req-1',
      toStatus: RequestStatus.COMPLETE,
      actorId: 'actor-1',
      reason: 'dossier complet',
    });

    expect(result).toBe(updated);
    expect(prisma.accreditationRequest.update).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { status: RequestStatus.COMPLETE },
    });
    expect(prisma.requestDecision.create).toHaveBeenCalledWith({
      data: {
        requestId: 'req-1',
        actorId: 'actor-1',
        fromStatus: RequestStatus.UNDER_REVIEW,
        toStatus: RequestStatus.COMPLETE,
        reason: 'dossier complet',
      },
    });
  });

  it('leve REQUEST_NOT_FOUND quand la demande est introuvable', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestId: 'missing',
        toStatus: RequestStatus.COMPLETE,
        actorId: 'actor-1',
      }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejette une transition non autorisee sans toucher a la base', async () => {
    const existing = buildRequest({ status: RequestStatus.DRAFT });
    prisma.accreditationRequest.findUnique.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        requestId: 'req-1',
        toStatus: RequestStatus.VALIDATED,
        actorId: 'actor-1',
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
