import { RequestStatus, type AccreditationRequest } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import type { EventBusPort } from '../../../../shared/kernel/ports/event-bus.port.js';
import type { QuotasFacade } from '../../../quotas/quotas.facade.js';
import { CancelRequestUseCase } from './cancel-request.usecase.js';

function buildRequest(
  overrides: Partial<AccreditationRequest> = {},
): AccreditationRequest {
  return {
    id: 'req-1',
    status: RequestStatus.SUBMITTED,
    requesterId: 'requester-1',
    matchId: 'match-1',
    categoryRequestedId: 'category-1',
    ...overrides,
  } as AccreditationRequest;
}

describe('CancelRequestUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    requestDecision: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let quotas: QuotasFacade;
  let eventBus: EventBusPort;
  let useCase: CancelRequestUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: { findUnique: vi.fn(), update: vi.fn() },
      requestDecision: { create: vi.fn() },
      $transaction: vi.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    quotas = { reserveSlot: vi.fn(), releaseSlot: vi.fn() };
    eventBus = { publish: vi.fn(), publishAll: vi.fn() };
    useCase = new CancelRequestUseCase(
      prisma as unknown as PrismaService,
      quotas,
      eventBus,
    );
  });

  it('leve REQUEST_NOT_FOUND quand la demande appartient a un autre demandeur', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(
      buildRequest({ requesterId: 'someone-else' }),
    );

    await expect(
      useCase.execute({
        requestId: 'req-1',
        actorId: 'actor-1',
        requesterId: 'requester-1',
      }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
  });

  it('libere le quota quand la demande deja validee est annulee', async () => {
    const request = buildRequest({ status: RequestStatus.VALIDATED });
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.update.mockResolvedValue({
      ...request,
      status: RequestStatus.CANCELLED,
    });
    prisma.requestDecision.create.mockResolvedValue({});

    await useCase.execute({ requestId: 'req-1', actorId: 'actor-1' });

    expect(quotas.releaseSlot).toHaveBeenCalledWith('match-1', 'category-1');
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('ne libere aucun quota pour une demande annulee avant validation', async () => {
    const request = buildRequest({ status: RequestStatus.SUBMITTED });
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.update.mockResolvedValue({
      ...request,
      status: RequestStatus.CANCELLED,
    });
    prisma.requestDecision.create.mockResolvedValue({});

    await useCase.execute({ requestId: 'req-1', actorId: 'actor-1' });

    expect(quotas.releaseSlot).not.toHaveBeenCalled();
  });
});
