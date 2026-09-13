import { RequestStatus, type AccreditationRequest } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import type { EventBusPort } from '../../../../shared/kernel/ports/event-bus.port.js';
import { RequestComplementUseCase } from './request-complement.usecase.js';

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

describe('RequestComplementUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    requestComplement: { create: ReturnType<typeof vi.fn> };
    requestDecision: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventBus: EventBusPort;
  let useCase: RequestComplementUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      requestComplement: { create: vi.fn() },
      requestDecision: { create: vi.fn() },
      $transaction: vi.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    eventBus = { publish: vi.fn(), publishAll: vi.fn() };
    useCase = new RequestComplementUseCase(
      prisma as unknown as PrismaService,
      eventBus,
    );
  });

  it('leve REQUEST_NOT_FOUND quand la demande est introuvable', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestId: 'missing',
        requestedById: 'staff-1',
        missingItem: 'carte de presse',
      }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
  });

  it('rejette la demande de complement si la transition est invalide', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(
      buildRequest({ status: RequestStatus.DRAFT }),
    );

    await expect(
      useCase.execute({
        requestId: 'req-1',
        requestedById: 'staff-1',
        missingItem: 'carte de presse',
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('cree le complement, passe la demande en INFO_REQUESTED et publie un evenement', async () => {
    const request = buildRequest();
    const complement = { id: 'complement-1' };
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.requestComplement.create.mockResolvedValue(complement);
    prisma.requestDecision.create.mockResolvedValue({});

    const result = await useCase.execute({
      requestId: 'req-1',
      requestedById: 'staff-1',
      missingItem: 'carte de presse',
      comment: 'photo illisible',
    });

    expect(result).toBe(complement);
    expect(prisma.requestComplement.create).toHaveBeenCalledWith({
      data: {
        requestId: 'req-1',
        requestedById: 'staff-1',
        missingItem: 'carte de presse',
        comment: 'photo illisible',
        dueDate: undefined,
      },
    });
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});
