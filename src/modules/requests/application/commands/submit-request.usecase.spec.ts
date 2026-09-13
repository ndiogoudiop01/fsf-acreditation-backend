import {
  RequestStatus,
  type AccreditationRequest,
  type Match,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import { ErrorCodes } from '../../../../shared/kernel/errors/error-catalog.js';
import type { EventBusPort } from '../../../../shared/kernel/ports/event-bus.port.js';
import type { MatchesFacade } from '../../../competitions/competitions.facade.js';
import { SubmitRequestUseCase } from './submit-request.usecase.js';

function buildRequest(
  overrides: Partial<AccreditationRequest> = {},
): AccreditationRequest {
  return {
    id: 'req-1',
    status: RequestStatus.DRAFT,
    requesterId: 'requester-1',
    matchId: 'match-1',
    categoryRequestedId: 'category-1',
    ...overrides,
  } as AccreditationRequest;
}

describe('SubmitRequestUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    requestDecision: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let matches: MatchesFacade;
  let eventBus: EventBusPort;
  let useCase: SubmitRequestUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      requestDecision: { create: vi.fn() },
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    matches = {
      getMatch: vi.fn().mockResolvedValue({ id: 'match-1' } as Match),
      assertAcceptingRequests: vi.fn(),
    };
    eventBus = { publish: vi.fn(), publishAll: vi.fn() };
    useCase = new SubmitRequestUseCase(
      prisma as unknown as PrismaService,
      matches,
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
        requesterId: 'requester-1',
        actorUserId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.REQUEST_NOT_FOUND });
    expect(matches.getMatch).not.toHaveBeenCalled();
  });

  it("propage l'erreur du match si les demandes sont fermees (periode close)", async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(buildRequest());
    (
      matches.assertAcceptingRequests as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new DomainError(
        ErrorCodes.MATCH_REQUESTS_CLOSED,
        'Periode de demande fermee.',
        'VALIDATION',
      );
    });

    await expect(
      useCase.execute({
        requestId: 'req-1',
        requesterId: 'requester-1',
        actorUserId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MATCH_REQUESTS_CLOSED });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('soumet la demande et marque le doublon eventuel sans bloquer', async () => {
    const request = buildRequest();
    const duplicate = buildRequest({ id: 'req-2' });
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.findFirst.mockResolvedValue(duplicate);
    prisma.accreditationRequest.update.mockResolvedValue({
      ...request,
      status: RequestStatus.SUBMITTED,
      duplicateOfId: duplicate.id,
    });
    prisma.requestDecision.create.mockResolvedValue({});

    const result = await useCase.execute({
      requestId: 'req-1',
      requesterId: 'requester-1',
      actorUserId: 'user-1',
    });

    expect(result.status).toBe(RequestStatus.SUBMITTED);
    expect(prisma.accreditationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: RequestStatus.SUBMITTED,
          duplicateOfId: duplicate.id,
        }),
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('soumet la demande sans doublon detecte', async () => {
    const request = buildRequest();
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.findFirst.mockResolvedValue(null);
    prisma.accreditationRequest.update.mockResolvedValue({
      ...request,
      status: RequestStatus.SUBMITTED,
    });
    prisma.requestDecision.create.mockResolvedValue({});

    await useCase.execute({
      requestId: 'req-1',
      requesterId: 'requester-1',
      actorUserId: 'user-1',
    });

    expect(prisma.accreditationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duplicateOfId: undefined }),
      }),
    );
  });
});
