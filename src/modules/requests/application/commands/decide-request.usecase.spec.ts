import {
  OverflowPolicy,
  RequestStatus,
  type AccreditationRequest,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/persistence/prisma/prisma.service.js';
import { DomainError } from '../../../../shared/kernel/errors/domain.error.js';
import type { EventBusPort } from '../../../../shared/kernel/ports/event-bus.port.js';
import type { QuotasFacade } from '../../../quotas/quotas.facade.js';
import type { AccreditationsFacade } from '../../../accreditations/accreditations.facade.js';
import { DecideRequestUseCase } from './decide-request.usecase.js';

function buildRequest(
  overrides: Partial<AccreditationRequest> = {},
): AccreditationRequest {
  return {
    id: 'req-1',
    status: RequestStatus.PENDING_VALIDATION,
    requesterId: 'requester-1',
    matchId: 'match-1',
    categoryRequestedId: 'category-1',
    ...overrides,
  } as AccreditationRequest;
}

describe('DecideRequestUseCase', () => {
  let prisma: {
    accreditationRequest: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    requestDecision: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let quotas: QuotasFacade;
  let accreditations: AccreditationsFacade;
  let eventBus: EventBusPort;
  let useCase: DecideRequestUseCase;

  beforeEach(() => {
    prisma = {
      accreditationRequest: { findUnique: vi.fn(), update: vi.fn() },
      requestDecision: { create: vi.fn() },
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    quotas = {
      reserveSlot: vi.fn(),
      releaseSlot: vi.fn(),
    };
    accreditations = {
      generateAccreditation: vi.fn(),
      findByRawToken: vi.fn(),
    };
    eventBus = { publish: vi.fn(), publishAll: vi.fn() };

    useCase = new DecideRequestUseCase(
      prisma as unknown as PrismaService,
      quotas,
      accreditations,
      eventBus,
    );
  });

  it('leve REQUEST_NOT_FOUND quand la demande est introuvable', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute({
        requestId: 'missing',
        actorId: 'actor-1',
        actorIsAdmin: false,
        status: RequestStatus.VALIDATED,
      }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND' });
  });

  it('refuse le refus si la transition est invalide', async () => {
    prisma.accreditationRequest.findUnique.mockResolvedValue(
      buildRequest({ status: RequestStatus.DRAFT }),
    );

    await expect(
      useCase.execute({
        requestId: 'req-1',
        actorId: 'actor-1',
        actorIsAdmin: false,
        status: RequestStatus.REJECTED,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('valide, reserve un quota puis genere le badge', async () => {
    const request = buildRequest();
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.update
      .mockResolvedValueOnce({ ...request, status: RequestStatus.VALIDATED })
      .mockResolvedValueOnce({
        ...request,
        status: RequestStatus.BADGE_GENERATED,
      });
    prisma.requestDecision.create.mockResolvedValue({});
    (quotas.reserveSlot as ReturnType<typeof vi.fn>).mockResolvedValue({
      reserved: true,
      overflowPolicy: OverflowPolicy.QUEUE,
      quotaTotal: 10,
      consumed: 3,
    });
    (
      accreditations.generateAccreditation as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ id: 'accred-1' });

    const result = await useCase.execute({
      requestId: 'req-1',
      actorId: 'actor-1',
      actorIsAdmin: false,
      status: RequestStatus.VALIDATED,
      zoneIds: ['zone-1'],
    });

    expect(quotas.reserveSlot).toHaveBeenCalledWith('match-1', 'category-1');
    expect(accreditations.generateAccreditation).toHaveBeenCalledWith(
      'req-1',
      ['zone-1'],
      { assignedBoothNumber: undefined, assignedFlashSlot: undefined },
    );
    expect(result.status).toBe(RequestStatus.BADGE_GENERATED);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('leve QUOTA_EXCEEDED sans generer de badge quand le quota est plein (politique QUEUE)', async () => {
    const request = buildRequest();
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    (quotas.reserveSlot as ReturnType<typeof vi.fn>).mockResolvedValue({
      reserved: false,
      overflowPolicy: OverflowPolicy.QUEUE,
      quotaTotal: 10,
      consumed: 10,
    });

    await expect(
      useCase.execute({
        requestId: 'req-1',
        actorId: 'actor-1',
        actorIsAdmin: false,
        status: RequestStatus.VALIDATED,
      }),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(accreditations.generateAccreditation).not.toHaveBeenCalled();
    expect(prisma.accreditationRequest.update).not.toHaveBeenCalled();
  });

  it('permet a un admin de forcer un depassement de quota PRIORITY via overrideQuota', async () => {
    const request = buildRequest();
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.update
      .mockResolvedValueOnce({ ...request, status: RequestStatus.VALIDATED })
      .mockResolvedValueOnce({
        ...request,
        status: RequestStatus.BADGE_GENERATED,
      });
    prisma.requestDecision.create.mockResolvedValue({});
    (
      accreditations.generateAccreditation as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ id: 'accred-1' });

    await useCase.execute({
      requestId: 'req-1',
      actorId: 'admin-1',
      actorIsAdmin: true,
      status: RequestStatus.VALIDATED,
      overrideQuota: true,
    });

    expect(quotas.reserveSlot).not.toHaveBeenCalled();
    expect(accreditations.generateAccreditation).toHaveBeenCalled();
  });

  it("refuse le forçage de quota si l'acteur n'est pas administrateur", async () => {
    const request = buildRequest();
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);

    await expect(
      useCase.execute({
        requestId: 'req-1',
        actorId: 'staff-1',
        actorIsAdmin: false,
        status: RequestStatus.VALIDATED,
        overrideQuota: true,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
    expect(accreditations.generateAccreditation).not.toHaveBeenCalled();
  });

  it('rejette une demande sans reserver de quota ni generer de badge', async () => {
    const request = buildRequest();
    prisma.accreditationRequest.findUnique.mockResolvedValue(request);
    prisma.accreditationRequest.update.mockResolvedValue({
      ...request,
      status: RequestStatus.REJECTED,
    });
    prisma.requestDecision.create.mockResolvedValue({});

    const result = await useCase.execute({
      requestId: 'req-1',
      actorId: 'actor-1',
      actorIsAdmin: false,
      status: RequestStatus.REJECTED,
      reason: 'documents non conformes',
    });

    expect(result.status).toBe(RequestStatus.REJECTED);
    expect(quotas.reserveSlot).not.toHaveBeenCalled();
    expect(accreditations.generateAccreditation).not.toHaveBeenCalled();
  });
});
